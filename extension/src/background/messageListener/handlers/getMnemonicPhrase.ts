import { Store } from "redux";

import { GetMnemonicPhraseMessage } from "@shared/api/types/message-request";
import { getIsHardwareWalletActive } from "background/helpers/account";
import { getNonHwKeyID } from "../helpers/get-non-hw-key-id";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID, TEMPORARY_STORE_EXTRA_ID } from "constants/localStorageTypes";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { getEncryptedTemporaryData } from "background/helpers/session";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

export const getMnemonicPhrase = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
}: {
  request: GetMnemonicPhraseMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
}) => {
  const { password } = request;

  const keyID = (await getIsHardwareWalletActive({ localStore }))
    ? await getNonHwKeyID({ localStore })
    : (await localStore.getItem(KEY_ID)) || "";

  let mnemonicPhrase = "";

  try {
    await unlockKeystore({ keyID, password, keyManager });
  } catch (e) {
    console.error(e);
    return { error: "Incorrect password" };
  }

  try {
    mnemonicPhrase = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });
  } catch (e) {
    console.error(e);
    return { error: "Mnemonic phrase not found" };
  }

  return {
    mnemonicPhrase,
  };
};
