import { Store } from "redux";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

import { ConfirmPasswordMessage } from "@shared/api/types/message-request";
import { getBipPath, getActiveAccountId } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getLinkConflicts } from "background/helpers/link-status";
import { listSecretSources } from "background/helpers/secret-sources";
import { APPLICATION_ID } from "constants/localStorageTypes";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { SessionTimer } from "background/helpers/session";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
  unlockHardwareWallet,
} from "background/ducks/session";

export const confirmPassword = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: ConfirmPasswordMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  /* In Popup, we call loadAccount to figure out what the state the user is in,
  then redirect them to <UnlockAccount /> if there's any missing data (public/private key, allAccounts, etc.)
  <UnlockAccount /> calls this method to fill in any missing data */

  const { password } = request;

  try {
    await loginToAllAccounts(
      password,
      localStore,
      sessionStore,
      keyManager,
      sessionTimer,
    );
  } catch (e) {
    return { error: "Incorrect password" };
  }

  // A successful password unlock also restores hardware-wallet access
  // for mixed-account installs — match today's behavior, where any
  // valid password unlock returns the user to a fully unlocked state.
  sessionStore.dispatch(unlockHardwareWallet());

  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);
  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    activeAccountId: await getActiveAccountId({ localStore }),
    hasPrivateKey: await hasPrivateKeySelector(sessionStore.getState()),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
    allAccounts: allAccountsSelector(sessionStore.getState()),
    bipPath: await getBipPath({ localStore }),
    // What earlier link passes stored. The pass this unlock started has not
    // answered yet; loadAccount picks its result up.
    linkConflicts: await getLinkConflicts({ localStore }),
    secretSources: await listSecretSources({ localStore }),
  };
};
