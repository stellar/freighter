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
}

export interface CallBackendV2Result {
  status: number;
  /** Parsed JSON body, or null on non-2xx. */
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
  } catch (_e) {
    // Locked (no hashKey) or no mnemonic → anonymous.
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
}: CallBackendV2Params): Promise<CallBackendV2Result> => {
  const doFetch = fetchImpl ?? fetch;
  const fullUrl = new URL(`${INDEXER_V2_URL}${path}`);
  const keypair = await tryGetAuthKeypair(sessionStore, localStore);

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

  return { status: res.status, body: res.ok ? await res.json() : null };
};
