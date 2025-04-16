import { Store } from "redux";

import { ShowBackupPhraseMessage } from "@shared/api/types/message-request";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { KEY_ID, TEMPORARY_STORE_EXTRA_ID } from "constants/localStorageTypes";
import {
  getEncryptedTemporaryData,
  SessionTimer,
} from "background/helpers/session";
import { loginToAllAccounts } from "../helpers/login-all-accounts";

export const showBackupPhrase = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: ShowBackupPhraseMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { password } = request;

  try {
    await unlockKeystore({
      keyID: (await localStore.getItem(KEY_ID)) || "",
      password,
      keyManager,
    });
  } catch (e) {
    return { error: "Incorrect Password" };
  }

  let mnemonicPhrase = await getEncryptedTemporaryData({
    sessionStore,
    localStore,
    keyName: TEMPORARY_STORE_EXTRA_ID,
  });

  if (!mnemonicPhrase) {
    try {
      await loginToAllAccounts(
        password,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      );
      mnemonicPhrase = await getEncryptedTemporaryData({
        sessionStore,
        localStore,
        keyName: TEMPORARY_STORE_EXTRA_ID,
      });
    } catch (e) {
      return { error: "Incorrect password" };
    }
  }

  return {
    mnemonicPhrase,
  };
};
