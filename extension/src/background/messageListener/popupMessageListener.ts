import { KeyManager, KeyManagerPlugins, KeyType } from "@stellar/wallet-sdk";
import StellarSdk from "stellar-sdk";
// @ts-ignore
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";

import { SERVICE_TYPES } from "@shared/constants/services";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { Account, Response as Request } from "@shared/api/types";
import { MessageResponder } from "background/types";

import {
  ALLOWLIST_ID,
  APPLICATION_ID,
  CACHED_ASSET_ICONS_ID,
  DATA_SHARING_ID,
  IS_TESTNET_ID,
  IS_VALIDATING_MEMO_ID,
  IS_VALIDATING_SAFETY_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";

import { getPunycodedDomain, getUrlHostname } from "helpers/urls";
import {
  addAccountName,
  getAccountNameList,
  getKeyIdList,
  getIsTestnet,
  getIsMemoValidationEnabled,
  getIsSafetyValidationEnabled,
} from "background/helpers/account";
import { getNetworkDetails } from "@shared/helpers/stellar";
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

  const _unlockKeystore = ({ password }: { password: string }) =>
    keyManager.loadKey(localStorage.getItem(KEY_ID) || "", password);

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

  const fundAccount = async () => {
    const { publicKey } = request;

    if (getIsTestnet()) {
      try {
        await fetch(
          `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
        );
      } catch (e) {
        console.error(e);
        throw new Error("Error creating account");
      }
    }

    return { publicKey };
  };

  const createAccount = async () => {
    const { password } = request;

    const mnemonicPhrase = generateMnemonic({ entropyBits: 128 });
    const wallet = fromMnemonic(mnemonicPhrase);

    const KEY_DERIVATION_NUMBER = 0;

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

    try {
      await _unlockKeystore({ password });
    } catch (e) {
      console.error(e);
      return { error: "Incorrect password" };
    }

    const wallet = fromMnemonic(mnemonicPhrase);
    const keyNumber =
      Number(localStorage.getItem(KEY_DERIVATION_NUMBER_ID)) + 1;

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
      await _unlockKeystore({ password });
      sourceKeys = StellarSdk.Keypair.fromSecret(privateKey);
    } catch (e) {
      console.error(e);
      return { error: "Please enter a valid secret key/password combination" };
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
    let publicKeyIndex = allAccounts.findIndex(
      (account: Account) => account.publicKey === publicKey,
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
      localStorage.clear();
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
      await _unlockKeystore({ password });
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
        addAccountName({ keyId, accountName: "Account 1" });
      }
    }
    /* end migration script */

    let activeAccountKeystore;

    // first make sure the password is correct to get active keystore, short circuit if not
    try {
      activeAccountKeystore = await _unlockKeystore({ password });
    } catch (e) {
      console.error(e);
      return { error: "Could not log into selected account" };
    }

    const {
      publicKey: activePublicKey,
      privateKey: activePrivateKey,
      extra: activeExtra = { mnemonicPhrase: "" },
    } = activeAccountKeystore;

    const activeMnemonicPhrase = activeExtra.mnemonicPhrase;

    const accountNameList = getAccountNameList();
    const unlockedAccounts = [] as Array<Account>;

    if (
      !publicKeySelector(store.getState()) ||
      !allAccountsSelector(store.getState()).length
    ) {
      // we have cleared redux store via reloading extension/browser
      // construct allAccounts from local storage
      // log the user in using all accounts and public key/phrase from above to create the store

      // for loop to preserve order of accounts
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < keyIdList.length; i++) {
        const keyId = keyIdList[i];
        let keyStore;

        // iterate over each keyId we have and get the associated keystore
        try {
          // eslint-disable-next-line no-await-in-loop
          keyStore = await keyManager.loadKey(keyId, password);
        } catch (e) {
          console.error(e);
        }

        if (keyStore) {
          // push the data into a list of accounts

          const { publicKey, extra = { mnemonicPhrase: "" } } = keyStore;
          const { imported = false } = extra;
          unlockedAccounts.push({
            publicKey,
            name: accountNameList[keyId] || `Account ${keyIdList.length}`,
            imported,
          });
        }
      }

      store.dispatch(
        logIn({
          publicKey: activePublicKey,
          mnemonicPhrase: activeMnemonicPhrase,
          allAccounts: unlockedAccounts,
        }),
      );
    }

    // start the timer now that we have active private key
    sessionTimer.startSession({ privateKey: activePrivateKey });

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

  const signFreighterTransaction = () => {
    const { transactionXDR, network } = request;
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      transactionXDR,
      network,
    );

    const privateKey = privateKeySelector(store.getState());
    if (privateKey.length) {
      const sourceKeys = StellarSdk.Keypair.fromSecret(privateKey);
      transaction.sign(sourceKeys);
      return { signedTransaction: transaction.toXDR() };
    }

    return { error: "Session timed out" };
  };

  const signOut = () => {
    store.dispatch(logOut());

    return {
      publicKey: publicKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    };
  };

  const saveSettings = () => {
    const {
      isDataSharingAllowed,
      isTestnet,
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
    } = request;

    localStorage.setItem(DATA_SHARING_ID, JSON.stringify(isDataSharingAllowed));
    localStorage.setItem(IS_TESTNET_ID, JSON.stringify(isTestnet));
    localStorage.setItem(
      IS_VALIDATING_MEMO_ID,
      JSON.stringify(isMemoValidationEnabled),
    );
    localStorage.setItem(
      IS_VALIDATING_SAFETY_ID,
      JSON.stringify(isSafetyValidationEnabled),
    );

    return {
      isDataSharingAllowed,
      isMemoValidationEnabled: getIsMemoValidationEnabled(),
      isSafetyValidationEnabled: getIsSafetyValidationEnabled(),
      networkDetails: getNetworkDetails(isTestnet),
    };
  };

  const loadSettings = () => {
    const dataSharingValue = localStorage.getItem(DATA_SHARING_ID) || "true";
    const isDataSharingAllowed = JSON.parse(dataSharingValue);

    return {
      isDataSharingAllowed,
      isMemoValidationEnabled: getIsMemoValidationEnabled(),
      isSafetyValidationEnabled: getIsSafetyValidationEnabled(),
      networkDetails: getNetworkDetails(getIsTestnet()),
    };
  };

  const getCachedAssetIcon = () => {
    const { assetCode } = request;

    const assetIconCache = JSON.parse(
      localStorage.getItem(CACHED_ASSET_ICONS_ID) || "{}",
    );

    return {
      iconUrl: assetIconCache[assetCode],
    };
  };

  const cacheAssetIcon = () => {
    const { assetCode, iconUrl } = request;

    const assetIconCache = JSON.parse(
      localStorage.getItem(CACHED_ASSET_ICONS_ID) || "{}",
    );
    assetIconCache[assetCode] = iconUrl;
    localStorage.setItem(CACHED_ASSET_ICONS_ID, JSON.stringify(assetIconCache));
  };

  const messageResponder: MessageResponder = {
    [SERVICE_TYPES.CREATE_ACCOUNT]: createAccount,
    [SERVICE_TYPES.FUND_ACCOUNT]: fundAccount,
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
    [SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION]: signFreighterTransaction,
    [SERVICE_TYPES.SIGN_OUT]: signOut,
    [SERVICE_TYPES.SHOW_BACKUP_PHRASE]: showBackupPhrase,
    [SERVICE_TYPES.SAVE_SETTINGS]: saveSettings,
    [SERVICE_TYPES.LOAD_SETTINGS]: loadSettings,
    [SERVICE_TYPES.GET_CACHED_ASSET_ICON]: getCachedAssetIcon,
    [SERVICE_TYPES.CACHE_ASSET_ICON]: cacheAssetIcon,
  };

  return messageResponder[request.type]();
};
