import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";

import { AddAccountMessage } from "@shared/api/types/message-request";
import {
  clearSession,
  getEncryptedTemporaryData,
  SessionTimer,
} from "background/helpers/session";
import { getDefaultMnemonic } from "background/helpers/secret-sources";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_DERIVATION_NUMBER_ID, KEY_ID } from "constants/localStorageTypes";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";
import { getIsHardwareWalletActive } from "background/helpers/account";
import { getNonHwKeyID } from "../helpers/get-non-hw-key-id";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { storeAccount } from "../helpers/store-account";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";

const { fromMnemonic } = StellarHDWallet;

export const addAccount = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: AddAccountMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const password = request.password;

  // Interim: derives from the wallet's default phrase until the source
  // becomes an explicit argument with its own index set.
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
      captureException(
        `Error logging in to all accounts in Add Account - ${JSON.stringify(
          e,
        )}`,
      );
      return { error: "Unable to login" };
    }
  }

  if (!source) {
    return { error: "No recovery phrase to derive from" };
  }

  const { mnemonic: mnemonicPhrase, sourceId: phraseSourceId } = source;

  const keyID = (await getIsHardwareWalletActive({ localStore }))
    ? await getNonHwKeyID({ localStore })
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
  } catch (e) {
    console.error(e);
    return { error: "Incorrect password" };
  }

  if (!activePrivateKey) {
    captureException("Error decrypting active private key in Add Account");
    return { error: "Incorrect password" };
  }

  const wallet = fromMnemonic(mnemonicPhrase);
  const keyNumber =
    Number(await localStore.getItem(KEY_DERIVATION_NUMBER_ID)) + 1;

  const keyPair = {
    publicKey: wallet.getPublicKey(keyNumber),
    privateKey: wallet.getSecret(keyNumber),
  };

  // Add the new account to our data store
  try {
    await storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
      phraseSourceId,
      sessionStore,
      keyManager,
      localStore,
    });
  } catch (e) {
    await clearSession({ localStore, sessionStore });
    captureException(`Error adding account: ${JSON.stringify(e)}`);
    return { error: "Error adding account" };
  }

  const keyId = keyNumber.toString();
  await localStore.setItem(KEY_DERIVATION_NUMBER_ID, keyId);

  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    publicKey: publicKeySelector(currentState),
    allAccounts: allAccountsSelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
  };
};
