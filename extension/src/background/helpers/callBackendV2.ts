import { captureException } from "@sentry/browser";
import { Store } from "redux";
import { Keypair } from "stellar-sdk";

import { deriveAuthKeypair } from "@shared/api/helpers/deriveAuthKeypair";
import { authedFetch } from "@shared/api/helpers/authedFetch";
import { INDEXER_V2_URL } from "@shared/constants/mercury";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { TEMPORARY_STORE_EXTRA_ID } from "constants/localStorageTypes";

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
   * Skip auth entirely: no keypair derivation, no JWT — always an anonymous
   * fetch. For endpoints that will never be auth-gated (e.g. rpc-health), this
   * avoids the per-request PBKDF2 cost of deriving the auth key.
   */
  skipAuth?: boolean;
}

export interface CallBackendV2Result {
  status: number;
  /** Parsed JSON body (including non-2xx error payloads); null if not JSON. */
  body: unknown;
}

/**
 * Returns the auth keypair when the session is unlocked (mnemonic present in the
 * encrypted session store), else null (locked / hardware-only / pre-onboarding).
 * On-demand derivation — never cached at rest (#2769).
 */
const tryGetAuthKeypair = async (
  sessionStore: Store,
  localStore: DataStorageAccess,
): Promise<Keypair | null> => {
  try {
    const mnemonic = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });
    if (!mnemonic) return null;
    const { keypair } = await deriveAuthKeypair(mnemonic);
    return keypair;
  } catch (e) {
    // getEncryptedTemporaryData returns "" for both a locked store and a
    // missing entry (handled by the `!mnemonic` check above), so anything
    // reaching here is unexpected — a corrupted temporaryStoreExtra entry or a
    // WebCrypto/PBKDF2 failure. Capture it: otherwise an unlocked user silently
    // downgrades to anonymous with zero telemetry the moment the backend
    // enforces auth on these endpoints.
    // Capture the original exception (not a JSON.stringify of it): stringifying
    // an Error yields "{}" and loses the stack, and JSON.stringify itself throws
    // on non-serializable values. Sentry preserves the stack; the context string
    // lives in `extra`.
    captureException(e, {
      extra: {
        context: "callBackendV2: unexpected error deriving auth keypair",
      },
    });
    return null;
  }
};

/**
 * The single chokepoint for freighter-backend-v2 requests. Attaches a fresh
 * per-request JWT when the session is unlocked; otherwise sends anonymously
 * (backend is permissive). The signed methodAndPath uses the server's full
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
  const keypair = skipAuth
    ? null
    : await tryGetAuthKeypair(sessionStore, localStore);

  let res: Response;
  if (keypair) {
    res = await authedFetch({
      keypair,
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
