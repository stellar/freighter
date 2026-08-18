import { Store } from "redux";
import { captureException } from "@sentry/browser";

import { deriveAuthKeypair } from "@shared/api/helpers/deriveAuthKeypair";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { TEMPORARY_STORE_EXTRA_ID } from "constants/localStorageTypes";

/**
 * Resolves the seed-derived analytics user id (the PUBLIC auth key hex) from
 * the unlocked session. Returns null when the store is locked or has no seed.
 * Never returns or exposes the private keypair. Mirrors
 * callBackendV2.tryGetAuthKeypair, but surfaces only the public userId.
 */
export const getAnalyticsUserId = async (
  sessionStore: Store,
  localStore: DataStorageAccess,
): Promise<string | null> => {
  try {
    const mnemonic = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });
    if (!mnemonic) return null;
    const { userId } = await deriveAuthKeypair(mnemonic);
    return userId;
  } catch (e) {
    // Mirrors callBackendV2.tryGetAuthKeypair: the locked / no-mnemonic case
    // is already handled by the `!mnemonic` check above, so anything reaching
    // here is unexpected (corrupted temporaryStoreExtra entry, WebCrypto/PBKDF2
    // failure, etc). Capture it — otherwise an unlocked user whose derivation
    // fails silently goes anonymous with zero signal.
    captureException(e, {
      extra: {
        context: "getAnalyticsUserId: unexpected error deriving auth keypair",
      },
    });
    return null;
  }
};
