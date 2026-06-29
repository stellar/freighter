import { Keypair } from "stellar-sdk";

import { buildAuthJwt } from "./buildAuthJwt";

export interface AuthedFetchParams {
  keypair: Keypair;
  baseUrl: string;
  method: string;
  /** Full request-target including any query string. */
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
  // Strip a trailing slash so the fetched URL can't diverge from the `path`
  // baked into the JWT's methodAndPath claim (a "//api/..." vs "/api/..." split
  // would be a silent 401).
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  // Non-GET requests require Content-Type: application/json per the backend contract.
  const baseHeaders: Record<string, string> =
    httpMethod === "GET" ? {} : { "Content-Type": "application/json" };

  const send = async (): Promise<Response> => {
    const jwt = await buildAuthJwt({ keypair, method: httpMethod, path, body });
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
