import { KeyManager, KeyManagerPlugins, KeyType } from "@stellar/wallet-sdk";
import StellarSdk from "stellar-sdk";
// @ts-ignore
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";

import { SERVICE_TYPES } from "@shared/constants/services";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { isTestnet } from "@shared/constants/stellar";

import { Account, Response as Request } from "@shared/api/types";
import { MessageResponder } from "background/types";

import {
  ACCOUNT_NAME_LIST_ID,
  ALLOWLIST_ID,
  APPLICATION_ID,
  DATA_SHARING_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";

import { getPunycodedDomain, getUrlHostname } from "helpers/urls";
import {
  addAccountName,
  getAccountNameList,
  getKeyIdList,
} from "background/helpers/account";
import { SessionTimer } from "background/helpers/session";

import { store } from "background/store";
import {
  allAccountsSelector,
  hasPrivateKeySelector,
  privateKeySelector,
  logIn,
  logOut,
  mnemonicPhraseSelector,
  publicKeySelector,
  setActivePublicKey,
  timeoutAccountAccess,
  updateAllAccountsAccountName,
} from "background/ducks/session";

const sessionTimer = new SessionTimer();

export const responseQueue: Array<(message?: any) => void> = [];
export const transactionQueue: Array<{
  sign: (sourceKeys: {}) => void;
  toXDR: () => void;
}> = [];

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const popupMessageListener = (request: Request) => {
  const localKeyStore = new KeyManagerPlugins.LocalStorageKeyStore();
  localKeyStore.configure({ storage: localStorage });
  const keyManager = new KeyManager({
    keyStore: localKeyStore,
  });
  keyManager.registerEncrypter(KeyManagerPlugins.ScryptEncrypter);

  const _storeAccount = async ({
    mnemonicPhrase,
    password,
    keyPair,
    imported = false,
  }: {
    mnemonicPhrase: string;
    password: string;
    keyPair: KeyPair;
    imported?: boolean;
  }) => {
    const { publicKey, privateKey } = keyPair;

    const allAccounts = allAccountsSelector(store.getState());
    const accountName = `Account ${allAccounts.length + 1}`;

    store.dispatch(
      logIn({
        publicKey,
        mnemonicPhrase,
        allAccounts: [
          ...allAccounts,
          {
            publicKey,
            name: accountName,
            imported,
          },
        ],
      }),
    );

    const keyMetadata = {
      key: {
        extra: { imported, mnemonicPhrase },
        type: KeyType.plaintextKey,
        publicKey,
        privateKey,
      },

      password,
      encrypterName: KeyManagerPlugins.ScryptEncrypter.name,
    };

    let keyStore = { id: "" };

    try {
      keyStore = await keyManager.storeKey(keyMetadata);
    } catch (e) {
      console.error(e);
    }

    const keyIdListArr = getKeyIdList();
    keyIdListArr.push(keyStore.id);

    localStorage.setItem(KEY_ID_LIST, JSON.stringify(keyIdListArr));
    localStorage.setItem(KEY_ID, keyStore.id);
    addAccountName({
      keyId: keyStore.id,
      accountName,
    });
  };

  const _fundAccount = async (publicKey: string) => {
    if (isTestnet) {
      // fund the account automatically if we're in a dev environment
      try {
        const response = await fetch(
          `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
        );
        const responseJSON = await response.json();
        console.log("SUCCESS! You have a new account :)\n", responseJSON);
      } catch (e) {
        console.error(e);
        throw new Error("Error creating account");
      }
    }
  };

  const createAccount = async () => {
    const { password } = request;

    const mnemonicPhrase = generateMnemonic({ entropyBits: 128 });
    const wallet = fromMnemonic(mnemonicPhrase);

    const KEY_DERIVATION_NUMBER = 0;

    await _fundAccount(wallet.getPublicKey(KEY_DERIVATION_NUMBER));

    localStorage.setItem(
      KEY_DERIVATION_NUMBER_ID,
      KEY_DERIVATION_NUMBER.toString(),
    );

    const keyPair = {
      publicKey: wallet.getPublicKey(KEY_DERIVATION_NUMBER),
      privateKey: wallet.getSecret(KEY_DERIVATION_NUMBER),
    };

    await _storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
    });
    localStorage.setItem(APPLICATION_ID, APPLICATION_STATE.PASSWORD_CREATED);

    const currentState = store.getState();

    return {
      allAccounts: allAccountsSelector(currentState),
      publicKey: publicKeySelector(currentState),
    };
  };

  const addAccount = async () => {
    const { password } = request;
    const mnemonicPhrase = mnemonicPhraseSelector(store.getState());

    if (!mnemonicPhrase) {
      return { error: "Mnemonic phrase not found" };
    }

    const wallet = fromMnemonic(mnemonicPhrase);
    const keyNumber =
      Number(localStorage.getItem(KEY_DERIVATION_NUMBER_ID)) + 1;
    await _fundAccount(wallet.getPublicKey(keyNumber));

    const keyPair = {
      publicKey: wallet.getPublicKey(keyNumber),
      privateKey: wallet.getSecret(keyNumber),
    };

    await _storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
    });

    localStorage.setItem(KEY_DERIVATION_NUMBER_ID, keyNumber.toString());

    store.dispatch(timeoutAccountAccess());

    const currentState = store.getState();

    return {
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
    };
  };

  const importAccount = async () => {
    const { password, privateKey } = request;
    let sourceKeys;

    try {
      sourceKeys = StellarSdk.Keypair.fromSecret(privateKey);
    } catch (e) {
      console.error(e);

      return {
        error: "Please enter a valid secret key/password combination",
      };
    }

    const keyPair = {
      publicKey: sourceKeys.publicKey(),
      privateKey,
    };

    const mnemonicPhrase = mnemonicPhraseSelector(store.getState());

    if (!mnemonicPhrase) {
      return { error: "Mnemonic phrase not found" };
    }

    await _storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
      imported: true,
    });

    sessionTimer.startSession({ privateKey });

    const currentState = store.getState();

    return {
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
    };
  };

  const makeAccountActive = () => {
    const { publicKey } = request;

    const allAccounts = allAccountsSelector(store.getState());
    let publicKeyIndex = allAccounts.findIndex((account) =>
      account.hasOwnProperty(publicKey),
    );
    publicKeyIndex = publicKeyIndex > -1 ? publicKeyIndex : 0;
    const keyIdList = getKeyIdList();

    const activeKeyId = keyIdList[publicKeyIndex];

    localStorage.setItem(KEY_ID, activeKeyId);

    store.dispatch(setActivePublicKey({ publicKey }));
    store.dispatch(timeoutAccountAccess());

    const currentState = store.getState();

    return {
      publicKey: publicKeySelector(currentState),
      hasPrivateKey: hasPrivateKeySelector(currentState),
    };
  };

  const updateAccountName = () => {
    const { accountName } = request;
    const keyId = localStorage.getItem(KEY_ID) || "";

    store.dispatch(
      updateAllAccountsAccountName({ updatedAccountName: accountName }),
    );
    addAccountName({ keyId, accountName });

    return {
      allAccounts: allAccountsSelector(store.getState()),
    };
  };

  const loadAccount = () => {
    const currentState = store.getState();

    return {
      hasPrivateKey: hasPrivateKeySelector(currentState),
      publicKey: publicKeySelector(currentState),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
      allAccounts: allAccountsSelector(currentState),
    };
  };

  const getMnemonicPhrase = () => ({
    mnemonicPhrase: mnemonicPhraseSelector(store.getState()),
  });

  const confirmMnemonicPhrase = () => {
    const isCorrectPhrase =
      mnemonicPhraseSelector(store.getState()) ===
      request.mnemonicPhraseToConfirm;

    const applicationState = isCorrectPhrase
      ? APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED
      : APPLICATION_STATE.MNEMONIC_PHRASE_FAILED;

    localStorage.setItem(APPLICATION_ID, applicationState);

    return {
      isCorrectPhrase,
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    };
  };

  const recoverAccount = () => {
    const { password, recoverMnemonic } = request;
    let wallet;
    let applicationState;

    // @TODO: We should clear any possible old localstorage
    try {
      wallet = fromMnemonic(recoverMnemonic);
    } catch (e) {
      console.error(e);
    }

    if (wallet) {
      const keyPair = {
        publicKey: wallet.getPublicKey(0),
        privateKey: wallet.getSecret(0),
      };
      localStorage.setItem(KEY_DERIVATION_NUMBER_ID, "0");

      _storeAccount({ mnemonicPhrase: recoverMnemonic, password, keyPair });

      // if we don't have an application state, assign them one
      applicationState =
        localStorage.getItem(APPLICATION_ID) ||
        APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

      localStorage.setItem(APPLICATION_ID, applicationState);
    }

    const currentState = store.getState();

    return {
      allAccounts: allAccountsSelector(currentState),
      publicKey: publicKeySelector(currentState),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    };
  };

  const showBackupPhrase = async () => {
    const { password } = request;

    try {
      await keyManager.loadKey(localStorage.getItem(KEY_ID) || "", password);
      return {};
    } catch (e) {
      return { error: "Incorrect Password" };
    }
  };

  const confirmPassword = async () => {
    /* In Popup, we call loadAccount to figure out what the state the user is in,
    then redirect them to <UnlockAccount /> if there's any missing data (public/private key, allAccounts, etc.)
    <UnlockAccount /> calls this method to fill in any missing data */

    const { password } = request;
    const keyIdList = getKeyIdList();

    /* migration needed to v1.0.6-beta data model */
    if (!keyIdList.length) {
      const keyId = localStorage.getItem(KEY_ID);
      if (keyId) {
        keyIdList.push(keyId);
        localStorage.setItem(KEY_ID_LIST, JSON.stringify(keyIdList));
        localStorage.setItem(KEY_DERIVATION_NUMBER_ID, "0");
        localStorage.setItem(
          ACCOUNT_NAME_LIST_ID,
          JSON.stringify({ [keyId]: "Account 1" }),
        );
      }
    }
    /* end migration script */

    const accountNameList = getAccountNameList();
    const unlockedAccounts = [] as Array<Account>;
    let selectedPublicKey = "";
    let selectedPrivateKey = "";
    let accountMnemonicPhrase;

    if (
      !publicKeySelector(store.getState()) ||
      !allAccountsSelector(store.getState()).length
    ) {
      // construct allAccounts and set the active account
      await Promise.all(
        keyIdList.map(async (keyId: string) => {
          let keyStore;
          try {
            keyStore = await keyManager.loadKey(keyId, password);
          } catch (e) {
            console.error(e);
          }

          if (keyStore) {
            const {
              publicKey,
              privateKey,
              extra = { mnemonicPhrase: "" },
            } = keyStore;
            const { mnemonicPhrase, imported = false } = extra;
            unlockedAccounts.push({
              publicKey,
              name: accountNameList[keyId] || `Account ${keyIdList.length}`,
              imported,
            });

            // if this account matches the keyId, set as active account
            if (keyId === localStorage.getItem(KEY_ID)) {
              selectedPublicKey = publicKey;
              selectedPrivateKey = privateKey;
              accountMnemonicPhrase = mnemonicPhrase;
            }
          }
        }),
      );

      store.dispatch(
        logIn({
          publicKey: selectedPublicKey,
          mnemonicPhrase: accountMnemonicPhrase,
          allAccounts: unlockedAccounts,
        }),
      );
    } else {
      let keyStore;
      try {
        keyStore = await keyManager.loadKey(
          localStorage.getItem(KEY_ID) || "",
          password,
        );
      } catch (e) {
        console.error(e);
        return { error: "Could not log into selected account" };
      }

      selectedPrivateKey = keyStore.privateKey;
    }
    sessionTimer.startSession({ privateKey: selectedPrivateKey });

    return {
      publicKey: publicKeySelector(store.getState()),
      hasPrivateKey: hasPrivateKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
      allAccounts: allAccountsSelector(store.getState()),
    };
  };

  const grantAccess = () => {
    const { url = "" } = request;
    const sanitizedUrl = getUrlHostname(url);
    const punycodedDomain = getPunycodedDomain(sanitizedUrl);

    // TODO: right now we're just grabbing the last thing in the queue, but this should be smarter.
    // Maybe we need to search through responses to find a matching reponse :thinking_face
    const response = responseQueue.pop();
    const allowListStr = localStorage.getItem(ALLOWLIST_ID) || "";
    const allowList = allowListStr.split(",");
    allowList.push(punycodedDomain);

    localStorage.setItem(ALLOWLIST_ID, allowList.join());

    if (typeof response === "function") {
      return response(url);
    }

    return { error: "Access was denied" };
  };

  const rejectAccess = () => {
    const response = responseQueue.pop();
    if (response) {
      response();
    }
  };

  const signTransaction = () => {
    const privateKey = privateKeySelector(store.getState());

    if (privateKey.length) {
      const sourceKeys = StellarSdk.Keypair.fromSecret(privateKey);

      let response;

      const transactionToSign = transactionQueue.pop();

      if (transactionToSign) {
        transactionToSign.sign(sourceKeys);
        response = transactionToSign.toXDR();
      }

      const transactionResponse = responseQueue.pop();

      if (typeof transactionResponse === "function") {
        transactionResponse(response);
        return {};
      }
    }

    return { error: "Session timed out" };
  };

  const rejectTransaction = () => {
    transactionQueue.pop();
    const response = responseQueue.pop();
    if (response) {
      response();
    }
  };

  const signOut = () => {
    store.dispatch(logOut());

    return {
      publicKey: publicKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    };
  };

  /* @TODO add toggle for Mainnet & Testnet */
  const saveSettings = () => {
    const { isDataSharingAllowed } = request;

    localStorage.setItem(DATA_SHARING_ID, JSON.stringify(isDataSharingAllowed));

    return {
      isDataSharingAllowed,
    };
  };

  const loadSettings = () => {
    const dataSharingValue = localStorage.getItem(DATA_SHARING_ID) || "true";
    const isDataSharingAllowed = JSON.parse(dataSharingValue);

    return {
      isDataSharingAllowed,
    };
  };

  const messageResponder: MessageResponder = {
    [SERVICE_TYPES.CREATE_ACCOUNT]: createAccount,
    [SERVICE_TYPES.ADD_ACCOUNT]: addAccount,
    [SERVICE_TYPES.IMPORT_ACCOUNT]: importAccount,
    [SERVICE_TYPES.LOAD_ACCOUNT]: loadAccount,
    [SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE]: makeAccountActive,
    [SERVICE_TYPES.UPDATE_ACCOUNT_NAME]: updateAccountName,
    [SERVICE_TYPES.GET_MNEMONIC_PHRASE]: getMnemonicPhrase,
    [SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE]: confirmMnemonicPhrase,
    [SERVICE_TYPES.RECOVER_ACCOUNT]: recoverAccount,
    [SERVICE_TYPES.CONFIRM_PASSWORD]: confirmPassword,
    [SERVICE_TYPES.GRANT_ACCESS]: grantAccess,
    [SERVICE_TYPES.REJECT_ACCESS]: rejectAccess,
    [SERVICE_TYPES.SIGN_TRANSACTION]: signTransaction,
    [SERVICE_TYPES.REJECT_TRANSACTION]: rejectTransaction,
    [SERVICE_TYPES.SIGN_OUT]: signOut,
    [SERVICE_TYPES.SHOW_BACKUP_PHRASE]: showBackupPhrase,
    [SERVICE_TYPES.SAVE_SETTINGS]: saveSettings,
    [SERVICE_TYPES.LOAD_SETTINGS]: loadSettings,
  };

  return messageResponder[request.type]();
};
