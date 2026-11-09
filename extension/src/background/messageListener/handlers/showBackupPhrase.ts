import { Store } from "redux";

import { ShowBackupPhraseMessage } from "@shared/api/types/message-request";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { KEY_ID } from "constants/localStorageTypes";
import { SessionTimer } from "background/helpers/session";
import { getDefaultMnemonic } from "background/helpers/secret-sources";
import { getIsHardwareWalletActive } from "background/helpers/account";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { getNonHwKeyID } from "../helpers/get-non-hw-key-id";

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

  // A hardware account's key id has no keystore, so check the password
  // against the first one that does. Every keystore shares the password.
  const keyID = (await getIsHardwareWalletActive({ localStore }))
    ? await getNonHwKeyID({ localStore })
    : (await localStore.getItem(KEY_ID)) || "";

  try {
    await unlockKeystore({ keyID, password, keyManager });
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
