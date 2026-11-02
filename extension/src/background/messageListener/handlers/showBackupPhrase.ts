import { Store } from "redux";

import { ShowBackupPhraseMessage } from "@shared/api/types/message-request";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { KEY_ID } from "constants/localStorageTypes";
import { SessionTimer } from "background/helpers/session";
import { getDefaultMnemonic } from "background/helpers/secret-sources";
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

  // Interim: shows the wallet's default phrase until the reveal is scoped
  // to the account's own source.
  let source = await getDefaultMnemonic({ sessionStore, localStore });

  if (!source) {
    try {
      await loginToAllAccounts(
        password,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      );
      source = await getDefaultMnemonic({ sessionStore, localStore });
    } catch (e) {
      return { error: "Incorrect password" };
    }
  }

  return {
    mnemonicPhrase: source?.mnemonic ?? "",
  };
};
