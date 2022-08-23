import { KeyManager, KeyManagerPlugins, KeyType } from "@stellar/wallet-sdk";
import StellarSdk from "stellar-sdk";
// @ts-ignore
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";

import { SERVICE_TYPES } from "@shared/constants/services";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";

import { Account, Response as Request } from "@shared/api/types";
import { MessageResponder } from "background/types";

import {
  ALLOWLIST_ID,
  APPLICATION_ID,
  CACHED_ASSET_ICONS_ID,
  DATA_SHARING_ID,
  IS_VALIDATING_MEMO_ID,
  IS_VALIDATING_SAFETY_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
  RECENT_ADDRESSES,
  CACHED_BLOCKED_DOMAINS_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
} from "constants/localStorageTypes";
import { MANAGE_NETWORK_ERROR } from "constants/networks";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";

import { getPunycodedDomain, getUrlHostname } from "helpers/urls";
import {
  addAccountName,
  getAccountNameList,
  getKeyIdList,
  getIsMainnet,
  getIsMemoValidationEnabled,
  getIsSafetyValidationEnabled,
  getIsHardwareWalletActive,
  getSavedNetworks,
  getNetworkDetails,
  getNetworksList,
  HW_PREFIX,
  getBipPath,
} from "background/helpers/account";
import { SessionTimer } from "background/helpers/session";
import { cachedFetch } from "background/helpers/cachedFetch";

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
  setActivePrivateKey,
  timeoutAccountAccess,
  updateAllAccountsAccountName,
} from "background/ducks/session";
import { STELLAR_EXPERT_BLOCKED_DOMAINS_URL } from "background/constants/apiUrls";

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

  const _unlockKeystore = ({
    password,
    keyID,
  }: {
    password: string;
    keyID: string;
  }) => keyManager.loadKey(keyID, password);

  // this returns the first non hardware wallet (Hw) keyID, if it exists.
  // Used for things like checking a password when a Hw is active.
  const _getNonHwKeyID = () => {
    const keyIdList = getKeyIdList();
    const nonHwKeyIds = keyIdList.filter(
      (k: string) => k.indexOf(HW_PREFIX) === -1,
    );
    return nonHwKeyIds[0] || "";
  };

  // in lieu of using KeyManager, let's store hW data in local storage
  // using schema:
  // "hw:<G account>": {
  //   publicKey: "",
  //   bipPath: "",
  // }
  const _storeHardwareWalletAccount = ({
    publicKey,
    hardwareWalletType,
    bipPath,
  }: {
    publicKey: string;
    hardwareWalletType: WalletType;
    bipPath: string;
  }) => {
    const mnemonicPhrase = mnemonicPhraseSelector(store.getState());
    let allAccounts = allAccountsSelector(store.getState());

    const keyId = `${HW_PREFIX}${publicKey}`;
    const keyIdListArr = getKeyIdList();
    const accountName = `${hardwareWalletType} ${
      keyIdListArr.filter((k: string) => k.indexOf(HW_PREFIX) !== -1).length + 1
    }`;

    if (keyIdListArr.indexOf(keyId) === -1) {
      keyIdListArr.push(keyId);
      localStorage.setItem(KEY_ID_LIST, JSON.stringify(keyIdListArr));
      const hwData = {
        bipPath,
        publicKey,
      };
      localStorage.setItem(keyId, JSON.stringify(hwData));
      addAccountName({
        keyId,
        accountName,
      });
      allAccounts = [
        ...allAccounts,
        {
          publicKey,
          name: accountName,
          imported: true,
          hardwareWalletType,
        },
      ];
    }

    localStorage.setItem(KEY_ID, keyId);

    store.dispatch(
      logIn({
        publicKey,
        mnemonicPhrase,
        allAccounts,
      }),
    );

    // an active hw account should not have an active private key
    store.dispatch(setActivePrivateKey({ privateKey: "" }));
  };

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

    // TODO IN THIS PR
    if (!getIsMainnet()) {
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

    const keyID = getIsHardwareWalletActive()
      ? _getNonHwKeyID()
      : localStorage.getItem(KEY_ID) || "";

    try {
      await _unlockKeystore({ keyID, password });
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

    sessionTimer.startSession();
    store.dispatch(setActivePrivateKey({ privateKey: keyPair.privateKey }));

    const currentState = store.getState();

    return {
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
      hasPrivateKey: hasPrivateKeySelector(currentState),
    };
  };

  const importAccount = async () => {
    const { password, privateKey } = request;
    let sourceKeys;
    const keyID = getIsHardwareWalletActive()
      ? _getNonHwKeyID()
      : localStorage.getItem(KEY_ID) || "";

    try {
      await _unlockKeystore({ keyID, password });
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

    sessionTimer.startSession();
    store.dispatch(setActivePrivateKey({ privateKey }));

    const currentState = store.getState();

    return {
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
      hasPrivateKey: hasPrivateKeySelector(currentState),
    };
  };

  const importHardwareWallet = async () => {
    const { publicKey, hardwareWalletType, bipPath } = request;

    await _storeHardwareWalletAccount({
      publicKey,
      hardwareWalletType,
      bipPath,
    });

    return {
      publicKey: publicKeySelector(store.getState()),
      allAccounts: allAccountsSelector(store.getState()),
      hasPrivateKey: hasPrivateKeySelector(store.getState()),
      bipPath: getBipPath(),
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
      bipPath: getBipPath(),
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

  const addCustomNetwork = () => {
    const { customNetwork } = request;
    const savedNetworks = getSavedNetworks();

    // Network Name already used
    if (
      savedNetworks.find(
        ({ networkName }: { networkName: string }) =>
          networkName === customNetwork.networkName,
      )
    ) {
      return {
        error: MANAGE_NETWORK_ERROR,
      };
    }

    const { isSwitchSelected, ...networkDetails } = customNetwork;
    const networksList: NetworkDetails[] = [...savedNetworks, networkDetails];

    localStorage.setItem(NETWORKS_LIST_ID, JSON.stringify(networksList));
    if (isSwitchSelected) {
      localStorage.setItem(NETWORK_ID, JSON.stringify(networkDetails));
    }

    return {
      networkDetails,
      networksList,
    };
  };

  const changeNetwork = () => {
    const { networkName } = request;

    const savedNetworks = JSON.parse(
      localStorage.getItem(NETWORKS_LIST_ID) ||
        JSON.stringify(DEFAULT_NETWORKS),
    ) as NetworkDetails[];

    const networkDetails =
      savedNetworks.find(
        ({ networkName: savedNetworkName }) => savedNetworkName === networkName,
      ) || MAINNET_NETWORK_DETAILS;

    localStorage.setItem(NETWORK_ID, JSON.stringify(networkDetails));

    return { networkDetails };
  };

  const loadAccount = () => {
    const currentState = store.getState();

    return {
      hasPrivateKey: hasPrivateKeySelector(currentState),
      publicKey: publicKeySelector(currentState),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
      allAccounts: allAccountsSelector(currentState),
      bipPath: getBipPath(),
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

      // start the timer now that we have active private key
      sessionTimer.startSession();
      store.dispatch(setActivePrivateKey({ privateKey: keyPair.privateKey }));
    }

    const currentState = store.getState();

    return {
      allAccounts: allAccountsSelector(currentState),
      publicKey: publicKeySelector(currentState),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
      hasPrivateKey: hasPrivateKeySelector(currentState),
    };
  };

  const showBackupPhrase = async () => {
    const { password } = request;

    try {
      await _unlockKeystore({
        keyID: localStorage.getItem(KEY_ID) || "",
        password,
      });
      return {};
    } catch (e) {
      return { error: "Incorrect Password" };
    }
  };

  const _getLocalStorageAccounts = async (password: string) => {
    const keyIdList = getKeyIdList();
    const accountNameList = getAccountNameList();
    const unlockedAccounts = [] as Array<Account>;

    // for loop to preserve order of accounts
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < keyIdList.length; i++) {
      const keyId = keyIdList[i];
      let keyStore;

      // iterate over each keyId we have and get the associated keystore
      let publicKey = "";
      let imported = false;
      let hardwareWalletType = WalletType.NONE;

      if (keyId.indexOf(HW_PREFIX) !== -1) {
        publicKey = keyId.split(":")[1];
        imported = true;
        // all hardware wallets are ledgers for now
        hardwareWalletType = WalletType.LEDGER;
      } else {
        try {
          // eslint-disable-next-line no-await-in-loop
          keyStore = await keyManager.loadKey(keyId, password);
        } catch (e) {
          console.error(e);
        }

        publicKey = keyStore?.publicKey || "";
        imported = keyStore?.extra.imported || false;
      }

      if (publicKey) {
        // push the data into a list of accounts
        unlockedAccounts.push({
          publicKey,
          name: accountNameList[keyId] || `Account ${keyIdList.length}`,
          imported,
          hardwareWalletType,
        });
      }
    }
    return unlockedAccounts;
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

    // if active hw then use the first non-hw keyID to check password
    // with keyManager
    let keyID = localStorage.getItem(KEY_ID) || "";
    let hwPublicKey = "";
    if (getIsHardwareWalletActive()) {
      hwPublicKey = keyID.split(":")[1];
      keyID = _getNonHwKeyID();
    }

    let activeAccountKeystore;

    // first make sure the password is correct to get active keystore, short circuit if not
    try {
      activeAccountKeystore = await _unlockKeystore({
        keyID,
        password,
      });
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

    if (
      !publicKeySelector(store.getState()) ||
      !allAccountsSelector(store.getState()).length
    ) {
      // we have cleared redux store via reloading extension/browser
      // construct allAccounts from local storage
      // log the user in using all accounts and public key/phrase from above to create the store

      store.dispatch(
        logIn({
          publicKey: hwPublicKey || activePublicKey,
          mnemonicPhrase: activeMnemonicPhrase,
          allAccounts: await _getLocalStorageAccounts(password),
        }),
      );
    }

    // start the timer now that we have active private key
    sessionTimer.startSession();
    if (!getIsHardwareWalletActive()) {
      store.dispatch(setActivePrivateKey({ privateKey: activePrivateKey }));
    }

    return {
      publicKey: publicKeySelector(store.getState()),
      hasPrivateKey: hasPrivateKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
      allAccounts: allAccountsSelector(store.getState()),
      bipPath: getBipPath(),
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

  const handleSignedHwTransaction = () => {
    const { signedTransaction } = request;

    const transactionResponse = responseQueue.pop();

    if (typeof transactionResponse === "function") {
      transactionResponse(signedTransaction);
      return {};
    }

    return { error: "Session timed out" };
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

  const addRecentAddress = () => {
    const { publicKey } = request;
    const storedJSON = localStorage.getItem(RECENT_ADDRESSES) || "[]";
    const recentAddresses = JSON.parse(storedJSON);
    if (recentAddresses.indexOf(publicKey) === -1) {
      recentAddresses.push(publicKey);
    }
    localStorage.setItem(RECENT_ADDRESSES, JSON.stringify(recentAddresses));

    return { recentAddresses };
  };

  const loadRecentAddresses = () => {
    const storedJSON = localStorage.getItem(RECENT_ADDRESSES) || "[]";
    const recentAddresses = JSON.parse(storedJSON);
    return { recentAddresses };
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
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
      networkDetails,
    } = request;

    localStorage.setItem(DATA_SHARING_ID, JSON.stringify(isDataSharingAllowed));
    localStorage.setItem(
      IS_VALIDATING_MEMO_ID,
      JSON.stringify(isMemoValidationEnabled),
    );
    localStorage.setItem(
      IS_VALIDATING_SAFETY_ID,
      JSON.stringify(isSafetyValidationEnabled),
    );
    localStorage.setItem(NETWORK_ID, JSON.stringify(networkDetails));

    return {
      isDataSharingAllowed,
      isMemoValidationEnabled: getIsMemoValidationEnabled(),
      isSafetyValidationEnabled: getIsSafetyValidationEnabled(),
      networkDetails: getNetworkDetails(),
      networksList: getNetworksList(),
    };
  };

  const loadSettings = () => {
    const dataSharingValue = localStorage.getItem(DATA_SHARING_ID) || "true";
    const isDataSharingAllowed = JSON.parse(dataSharingValue);

    return {
      isDataSharingAllowed,
      isMemoValidationEnabled: getIsMemoValidationEnabled(),
      isSafetyValidationEnabled: getIsSafetyValidationEnabled(),
      networkDetails: getNetworkDetails(),
      networksList: getNetworksList(),
    };
  };

  const getCachedAssetIcon = () => {
    const { assetCanonical } = request;

    const assetIconCache = JSON.parse(
      localStorage.getItem(CACHED_ASSET_ICONS_ID) || "{}",
    );

    return {
      iconUrl: assetIconCache[assetCanonical] || "",
    };
  };

  const cacheAssetIcon = () => {
    const { assetCanonical, iconUrl } = request;

    const assetIconCache = JSON.parse(
      localStorage.getItem(CACHED_ASSET_ICONS_ID) || "{}",
    );
    assetIconCache[assetCanonical] = iconUrl;
    localStorage.setItem(CACHED_ASSET_ICONS_ID, JSON.stringify(assetIconCache));
  };

  const getBlockedDomains = async () => {
    try {
      const resp = await cachedFetch(
        STELLAR_EXPERT_BLOCKED_DOMAINS_URL,
        CACHED_BLOCKED_DOMAINS_ID,
      );
      return { blockedDomains: resp?._embedded?.records || [] };
    } catch (e) {
      console.error(e);
      return new Error("Error getting blocked domains");
    }
  };

  const messageResponder: MessageResponder = {
    [SERVICE_TYPES.CREATE_ACCOUNT]: createAccount,
    [SERVICE_TYPES.FUND_ACCOUNT]: fundAccount,
    [SERVICE_TYPES.ADD_ACCOUNT]: addAccount,
    [SERVICE_TYPES.IMPORT_ACCOUNT]: importAccount,
    [SERVICE_TYPES.IMPORT_HARDWARE_WALLET]: importHardwareWallet,
    [SERVICE_TYPES.LOAD_ACCOUNT]: loadAccount,
    [SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE]: makeAccountActive,
    [SERVICE_TYPES.UPDATE_ACCOUNT_NAME]: updateAccountName,
    [SERVICE_TYPES.ADD_CUSTOM_NETWORK]: addCustomNetwork,
    [SERVICE_TYPES.CHANGE_NETWORK]: changeNetwork,
    [SERVICE_TYPES.GET_MNEMONIC_PHRASE]: getMnemonicPhrase,
    [SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE]: confirmMnemonicPhrase,
    [SERVICE_TYPES.RECOVER_ACCOUNT]: recoverAccount,
    [SERVICE_TYPES.CONFIRM_PASSWORD]: confirmPassword,
    [SERVICE_TYPES.GRANT_ACCESS]: grantAccess,
    [SERVICE_TYPES.REJECT_ACCESS]: rejectAccess,
    [SERVICE_TYPES.SIGN_TRANSACTION]: signTransaction,
    [SERVICE_TYPES.HANDLE_SIGNED_HW_TRANSACTION]: handleSignedHwTransaction,
    [SERVICE_TYPES.REJECT_TRANSACTION]: rejectTransaction,
    [SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION]: signFreighterTransaction,
    [SERVICE_TYPES.ADD_RECENT_ADDRESS]: addRecentAddress,
    [SERVICE_TYPES.LOAD_RECENT_ADDRESSES]: loadRecentAddresses,
    [SERVICE_TYPES.SIGN_OUT]: signOut,
    [SERVICE_TYPES.SHOW_BACKUP_PHRASE]: showBackupPhrase,
    [SERVICE_TYPES.SAVE_SETTINGS]: saveSettings,
    [SERVICE_TYPES.LOAD_SETTINGS]: loadSettings,
    [SERVICE_TYPES.GET_CACHED_ASSET_ICON]: getCachedAssetIcon,
    [SERVICE_TYPES.CACHE_ASSET_ICON]: cacheAssetIcon,
    [SERVICE_TYPES.GET_BLOCKED_DOMAINS]: getBlockedDomains,
  };

  return messageResponder[request.type]();
};
