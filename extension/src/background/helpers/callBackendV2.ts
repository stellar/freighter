import { Store } from "redux";

import { authedFetch } from "@shared/api/helpers/authedFetch";
import { INDEXER_V2_URL } from "@shared/constants/mercury";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getSigningIdentity } from "background/helpers/signing-identity";

export interface CallBackendV2Params {
  method: string;
  /** Path relative to INDEXER_V2_URL, INCLUDING any query string, e.g. "/protocols". */
  path: string;
  body?: string;
  sessionStore: Store;
  localStore: DataStorageAccess;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /**
   * Skip auth entirely: no identity resolution, no JWT — always an anonymous
   * fetch. For endpoints that will never be auth-gated (e.g. rpc-health).
   */
  skipAuth?: boolean;
}

export interface CallBackendV2Result {
  status: number;
  /** Parsed JSON body (including non-2xx error payloads); null if not JSON. */
  body: unknown;
}

/**
 * The single chokepoint for freighter-backend-v2 requests. Attaches a fresh
 * per-request JWT signed by the wallet's pinned source (see
 * getSigningIdentity) when the session holds a signer; otherwise sends
 * anonymously (backend is permissive). Nothing in the request selects the
 * identity. The signed methodAndPath uses the server's full
 * request-target (incl. /api/v1), derived from the resolved URL.
 */
export const callBackendV2 = async ({
  method,
  path,
  body,
  sessionStore,
  localStore,
  fetchImpl,
  skipAuth,
}: CallBackendV2Params): Promise<CallBackendV2Result> => {
  const doFetch = fetchImpl ?? fetch;
  const fullUrl = new URL(`${INDEXER_V2_URL}${path}`);
  const identity = skipAuth
    ? null
    : await getSigningIdentity({ sessionStore, localStore });

  let res: Response;
  if (identity) {
    res = await authedFetch({
      keypair: identity.keypair,
      baseUrl: fullUrl.origin,
      method,
      path: `${fullUrl.pathname}${fullUrl.search}`,
      body,
      fetchImpl: doFetch,
    });
  } else {
    res = await doFetch(fullUrl.href, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body,
    });
  }

  // Parse the body on error responses too — a non-2xx JSON payload carries the
  // server's diagnostic detail, which callers surface to Sentry. Falls back to
  // null only when the body isn't valid JSON.
  const parsedBody = await res.json().catch(() => null);
  return { status: res.status, body: parsedBody };
};
