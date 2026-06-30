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
    });
    return doFetch(url, {
      method: httpMethod,
      headers: { ...baseHeaders, Authorization: `Bearer ${jwt}` },
      body,
    });
  };

  const first = await send();
  if (first.status !== 401) return first;
  return send();
};
