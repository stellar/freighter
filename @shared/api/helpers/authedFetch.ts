import { Keypair } from "stellar-sdk";

import { buildAuthJwt } from "./buildAuthJwt";

export interface AuthedFetchParams {
  keypair: Keypair;
  baseUrl: string;
  method: string;
  /**
   * Path appended to `baseUrl`; include any query string. The signed
   * methodAndPath is derived from the resulting URL's path+query (not this
   * fragment alone), so it always matches the request target the server sees —
   * regardless of whether an `/api/v1` prefix lives in `baseUrl` or here.
   */
  path: string;
  body?: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Server-time offset in ms (serverEpochMs − localEpochMs), learned from the
 * `Date` header the backend returns on every response. The per-request JWT is
 * signed against `Date.now() + serverTimeOffsetMs` so its iat/exp track the
 * SERVER's clock rather than the device's. This removes any dependence on local
 * clock accuracy: a skewed device clock would otherwise push every 15s token
 * outside the server's validation window and 401 — no matter how wide a fixed
 * skew leeway the server allows, since a local clock can be arbitrarily wrong.
 *
 * Module scope so it survives across requests for the life of the service
 * worker. It is not secret. On worker restart it resets to 0 (falls back to the
 * local clock); the first 401 then re-teaches it from that response's `Date`
 * header and the built-in retry re-signs correctly, so no request stays broken.
 */
let serverTimeOffsetMs = 0;

/** Refresh serverTimeOffsetMs from a response's `Date` header when present/valid. */
const learnServerTimeOffset = (res: Response): void => {
  const dateHeader = res.headers.get("Date");
  if (!dateHeader) return;
  const serverMs = Date.parse(dateHeader);
  if (Number.isNaN(serverMs)) return;
  serverTimeOffsetMs = serverMs - Date.now();
};

/**
 * Sends a request authenticated with a fresh per-request JWT. On 401 it rebuilds
 * a fresh JWT and retries exactly once, returning that response (success or the
 * second 401). The JWT is never cached.
 */
export const authedFetch = async ({
  keypair,
  baseUrl,
  method,
  path,
  body,
  fetchImpl,
}: AuthedFetchParams): Promise<Response> => {
  const doFetch = fetchImpl ?? fetch;
  // Upper-case the method once and use it for BOTH the signed methodAndPath
  // claim and the wire request, so they can't diverge. buildAuthJwt signs the
  // upper-cased method, but fetch only auto-uppercases the standard verbs
  // (GET/POST/...), not PATCH or custom methods — sending the raw lower-case
  // method would leave the server's `r.Method` mismatching the signed claim and
  // produce a silent 401.
  const httpMethod = method.toUpperCase();
  // Strip a trailing slash so the fetched URL can't gain a "//api/..." split.
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  // Sign the ACTUAL request target the server compares against — its
  // r.URL.RequestURI() is the full path+query, including any prefix carried by
  // baseUrl (the backend base is "<host>/api/v1"). Deriving it from the final
  // URL, rather than signing the bare `path` fragment, keeps the signed
  // methodAndPath identical to the wire request no matter how the prefix is
  // split between baseUrl and path — otherwise base "<host>/api/v1" + path
  // "/contacts" would fetch "/api/v1/contacts" but sign "/contacts" → 401.
  const { pathname, search } = new URL(url);
  const requestTarget = `${pathname}${search}`;
  // Non-GET requests require Content-Type: application/json per the backend contract.
  const baseHeaders: Record<string, string> =
    httpMethod === "GET" ? {} : { "Content-Type": "application/json" };

  const send = async (): Promise<Response> => {
    const jwt = await buildAuthJwt({
      keypair,
      method: httpMethod,
      path: requestTarget,
      body,
      // Sign against the SERVER's clock (see serverTimeOffsetMs), not the
      // device's, so a skewed local clock can't push iat/exp outside the 15s
      // validation window.
      now: Date.now() + serverTimeOffsetMs,
    });
    const res = await doFetch(url, {
      method: httpMethod,
      headers: { ...baseHeaders, Authorization: `Bearer ${jwt}` },
      body,
    });
    // Learn/refresh the offset from THIS response — including a 401's `Date`
    // header — so the retry below (and subsequent requests) sign against server
    // time even on the first call after a cold start.
    learnServerTimeOffset(res);
    return res;
  };

  const first = await send();
  if (first.status !== 401) return first;
  return send();
};
