import { Store } from "redux";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

import { ConfirmPasswordMessage } from "@shared/api/types/message-request";
import {
  addAccountName,
  getBipPath,
  getKeyIdList,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  APPLICATION_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { SessionTimer } from "background/helpers/session";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
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
  const keyIdList = await getKeyIdList({ localStore });

  /* migration needed to v1.0.6-beta data model */
  if (!keyIdList.length) {
    const keyId = await localStore.getItem(KEY_ID);
    if (keyId) {
      keyIdList.push(keyId);
      await localStore.setItem(KEY_ID_LIST, keyIdList);
      await localStore.setItem(KEY_DERIVATION_NUMBER_ID, "0");
      await addAccountName({ keyId, accountName: "Account 1", localStore });
    }
  }
  /* end migration script */

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

  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);
  return {
    publicKey: publicKeySelector(sessionStore.getState()),
    hasPrivateKey: await hasPrivateKeySelector(sessionStore.getState()),
    applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
    allAccounts: allAccountsSelector(sessionStore.getState()),
    bipPath: await getBipPath({ localStore }),
  };
};
