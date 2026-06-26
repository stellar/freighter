import { Keypair } from "stellar-sdk";

import { buildAuthJwt } from "./buildAuthJwt";

export interface AuthedFetchParams {
  keypair: Keypair;
  baseUrl: string;
  method: string;
  /** Full request-target including any query string. */
  path: string;
  body?: Uint8Array | string;
  headers?: Record<string, string>;
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
  headers,
  fetchImpl,
}: AuthedFetchParams): Promise<Response> => {
  const doFetch = fetchImpl ?? fetch;
  // Strip a trailing slash so the fetched URL can't diverge from the `path`
  // baked into the JWT's methodAndPath claim (a "//api/..." vs "/api/..." split
  // would be a silent 401).
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  const baseHeaders: Record<string, string> = {
    ...(method.toUpperCase() === "GET"
      ? {}
      : { "Content-Type": "application/json" }),
    ...headers,
  };

  const send = async (): Promise<Response> => {
    const jwt = await buildAuthJwt({ keypair, method, path, body });
    return doFetch(url, {
      method,
      headers: { ...baseHeaders, Authorization: `Bearer ${jwt}` },
      body,
    });
  };

  const first = await send();
  if (first.status !== 401) return first;
  return send();
};
