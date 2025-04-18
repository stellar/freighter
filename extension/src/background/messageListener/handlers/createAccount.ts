import { Store } from "redux";
import { captureException } from "@sentry/browser";
// @ts-ignore
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

import { CreateAccountMessage } from "@shared/api/types/message-request";
import { clearAccount } from "../helpers/clear-account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  APPLICATION_ID,
  KEY_DERIVATION_NUMBER_ID,
} from "constants/localStorageTypes";
import { clearSession, SessionTimer } from "background/helpers/session";
import { storeAccount } from "../helpers/store-account";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";

export const createAccount = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: CreateAccountMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { password, isOverwritingAccount } = request;

  if (isOverwritingAccount) {
    await clearAccount(localStore);
  }

  const mnemonicPhrase = generateMnemonic({ entropyBits: 128 });
  const wallet = fromMnemonic(mnemonicPhrase);

  const KEY_DERIVATION_NUMBER = 0;
  const keyId = KEY_DERIVATION_NUMBER.toString();

  await localStore.setItem(KEY_DERIVATION_NUMBER_ID, keyId);

  const keyPair = {
    publicKey: wallet.getPublicKey(KEY_DERIVATION_NUMBER),
    privateKey: wallet.getSecret(KEY_DERIVATION_NUMBER),
  };

  await clearSession({ localStore, sessionStore });

  try {
    await storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
      isSettingHashKey: true,
      localStore,
      sessionStore,
      keyManager,
    });
  } catch (e) {
    console.error(e);
    captureException(`Error creating account: ${JSON.stringify(e)}`);
    return { error: "Error creating account" };
  }

  await localStore.setItem(APPLICATION_ID, APPLICATION_STATE.PASSWORD_CREATED);

  const currentState = sessionStore.getState();

  sessionTimer.startSession();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    allAccounts: allAccountsSelector(currentState),
    publicKey: publicKeySelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
  };
};
