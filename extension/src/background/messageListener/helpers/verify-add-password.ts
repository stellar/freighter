import { Store } from "redux";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";

import {
  INCORRECT_PASSWORD_ERROR,
  NO_SOFTWARE_KEYSTORE_ERROR,
  UNABLE_TO_LOGIN_ERROR,
} from "@shared/constants/errors";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getActiveHashKeyCryptoKey,
  SessionTimer,
} from "background/helpers/session";
import { getIsHardwareWalletActive } from "background/helpers/account";
import { KEY_ID } from "constants/localStorageTypes";
import { loginToAllAccounts } from "./login-all-accounts";
import { getNonHwKeyID } from "./get-non-hw-key-id";
import { unlockKeystore } from "./unlock-keystore";

export { NO_SOFTWARE_KEYSTORE_ERROR };

/*
  Checks a password against the active software keystore, for handlers that
  add to a live wallet. Returns null when the password unlocks it, otherwise
  the error string to hand back to the popup.
*/
export const verifyAddPassword = async ({
  password,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  password: string;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}): Promise<string | null> => {
  const keyID = (await getIsHardwareWalletActive({ localStore }))
    ? await getNonHwKeyID({ localStore })
    : (await localStore.getItem(KEY_ID)) || "";

  // Onboarding always writes a password-protected software keystore before a
  // hardware account can be added, so this is unreachable today. Without
  // one, every password would fail as if it were wrong.
  if (!keyID) {
    return NO_SOFTWARE_KEYSTORE_ERROR;
  }

  if ((await getActiveHashKeyCryptoKey({ sessionStore })) === null) {
    try {
      await loginToAllAccounts(
        password,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      );
    } catch (e) {
      captureException(
        `Error logging in to all accounts while verifying password - ${JSON.stringify(
          e,
        )}`,
      );
      return UNABLE_TO_LOGIN_ERROR;
    }
  }

  try {
    await unlockKeystore({ keyID, password, keyManager });
  } catch (e) {
    console.error(e);
    return INCORRECT_PASSWORD_ERROR;
  }

  return null;
};
