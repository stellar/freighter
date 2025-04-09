import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";

import { ImportAccountMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getEncryptedTemporaryData,
  SessionTimer,
} from "background/helpers/session";
import { KEY_ID, TEMPORARY_STORE_EXTRA_ID } from "constants/localStorageTypes";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { getNonHwKeyID } from "../helpers/get-non-hw-key-id";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { getIsHardwareWalletActive } from "background/helpers/account";
import { storeAccount } from "../helpers/store-account";
import {
  allAccountsSelector,
  hasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";

export const importAccount = async ({
  request,
  sessionStore,
  localStore,
  keyManager,
  sessionTimer,
}: {
  request: ImportAccountMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { password, privateKey } = request;
  let sourceKeys;

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
      captureException(
        `Error logging in to all accounts in Import Account - ${JSON.stringify(
          e,
        )}`,
      );
      return { error: "Unable to login" };
    }
  }

  const keyID = (await getIsHardwareWalletActive())
    ? await getNonHwKeyID()
    : (await localStore.getItem(KEY_ID)) || "";
  // if the session is active, confirm that the password is correct and the hashkey properly unlocks
  let activePrivateKey = "";

  try {
    await unlockKeystore({ keyID, password, keyManager });
    activePrivateKey = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: keyID,
    });
    sourceKeys = Keypair.fromSecret(privateKey);
  } catch (e) {
    console.error(e);
    return { error: "Please enter a valid secret key/password combination" };
  }

  const keyPair = {
    publicKey: sourceKeys.publicKey(),
    privateKey,
  };

  try {
    await storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
      imported: true,
      sessionStore,
      localStore,
      keyManager,
    });
  } catch (e) {
    captureException(`Error importing account: ${JSON.stringify(e)}`);
    return { error: "Error importing account" };
  }

  if (!activePrivateKey) {
    captureException("Error decrypting active private key in Import Account");
    return { error: "Error importing account" };
  }

  const currentState = sessionStore.getState();

  return {
    publicKey: publicKeySelector(currentState),
    allAccounts: allAccountsSelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
  };
};
