import { Store } from "redux";

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
  } catch {
    return null;
  }
};
