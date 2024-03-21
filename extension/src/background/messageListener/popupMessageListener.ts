/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Store } from "redux";
import {
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  hash,
} from "stellar-sdk";
import { KeyManager, KeyManagerPlugins, KeyType } from "@stellar/wallet-sdk";
import browser from "webextension-polyfill";
// @ts-ignore
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";
import { BigNumber } from "bignumber.js";

import { SERVICE_TYPES } from "@shared/constants/services";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";
import {
  stellarSdkServer,
  submitTx,
} from "@shared/api/helpers/stellarSdkServer";
import { calculateSenderMinBalance } from "@shared/helpers/migration";

import {
  Account,
  Response as Request,
  BlockedDomains,
  BlockedAccount,
  MigratableAccount,
} from "@shared/api/types";
import { MessageResponder } from "background/types";

import {
  ALLOWLIST_ID,
  APPLICATION_ID,
  CACHED_ASSET_ICONS_ID,
  CACHED_ASSET_DOMAINS_ID,
  DATA_SHARING_ID,
  IS_VALIDATING_MEMO_ID,
  IS_VALIDATING_SAFETY_ID,
  IS_VALIDATING_SAFE_ASSETS_ID,
  IS_EXPERIMENTAL_MODE_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
  RECENT_ADDRESSES,
  CACHED_BLOCKED_DOMAINS_ID,
  CACHED_BLOCKED_ACCOUNTS_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  TOKEN_ID_LIST,
} from "constants/localStorageTypes";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
  NETWORK_URLS,
} from "@shared/constants/stellar";

import { EXPERIMENTAL } from "constants/featureFlag";
import { getPunycodedDomain, getUrlHostname } from "helpers/urls";
import {
  addAccountName,
  getAccountNameList,
  getAllowList,
  getKeyIdList,
  getIsMemoValidationEnabled,
  getIsSafetyValidationEnabled,
  getIsValidatingSafeAssetsEnabled,
  getIsExperimentalModeEnabled,
  getIsHardwareWalletActive,
  getIsRpcHealthy,
  getUserNotification,
  getSavedNetworks,
  getNetworkDetails,
  getNetworksList,
  HW_PREFIX,
  getBipPath,
  subscribeTokenBalance,
  subscribeAccount,
  subscribeTokenHistory,
  getFeatureFlags,
  verifySorobanRpcUrls,
} from "background/helpers/account";
import { SessionTimer } from "background/helpers/session";
import { cachedFetch } from "background/helpers/cachedFetch";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorage";
import { migrateTrustlines } from "background/helpers/migration";
import { xlmToStroop } from "helpers/stellar";

import {
  allAccountsSelector,
  hasPrivateKeySelector,
  privateKeySelector,
  logIn,
  logOut,
  migratedMnemonicPhraseSelector,
  mnemonicPhraseSelector,
  publicKeySelector,
  setActivePublicKey,
  setActivePrivateKey,
  timeoutAccountAccess,
  updateAllAccountsAccountName,
  reset,
  passwordSelector,
  setMigratedMnemonicPhrase,
} from "background/ducks/session";
import {
  STELLAR_EXPERT_BLOCKED_DOMAINS_URL,
  STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL,
} from "background/constants/apiUrls";

// number of public keys to auto-import
const numOfPublicKeysToCheck = 5;
const sessionTimer = new SessionTimer();

// eslint-disable-next-line
export const responseQueue: Array<(message?: any) => void> = [];
export const transactionQueue: Transaction[] = [];
export const blobQueue: {
  isDomainListedAllowed: boolean;
  domain: string;
  tab: browser.Tabs.Tab | undefined;
  blob: string;
  url: string;
  accountToSign: string;
}[] = [];

export const authEntryQueue: {
  accountToSign: string;
  tab: browser.Tabs.Tab | undefined;
  entry: string; // xdr.SorobanAuthorizationEntry
  url: string;
}[] = [];

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const popupMessageListener = (request: Request, sessionStore: Store) => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const localKeyStore = new KeyManagerPlugins.BrowserStorageKeyStore();
  localKeyStore.configure({ storage: browserLocalStorage });
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
  const _getNonHwKeyID = async () => {
    const keyIdList = await getKeyIdList();
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
  const _storeHardwareWalletAccount = async ({
    publicKey,
    hardwareWalletType,
    bipPath,
  }: {
    publicKey: string;
    hardwareWalletType: WalletType;
    bipPath: string;
  }) => {
    const mnemonicPhrase = mnemonicPhraseSelector(sessionStore.getState());
    let allAccounts = allAccountsSelector(sessionStore.getState());

    const keyId = `${HW_PREFIX}${publicKey}`;
    const keyIdListArr = await getKeyIdList();
    const accountName = `${hardwareWalletType} ${
      allAccounts.filter(
        ({ hardwareWalletType: hwType }) => hwType !== hardwareWalletType,
      ).length + 1
    }`;

    if (keyIdListArr.indexOf(keyId) === -1) {
      keyIdListArr.push(keyId);
      await localStore.setItem(KEY_ID_LIST, keyIdListArr);
      const hwData = {
        bipPath,
        publicKey,
      };
      await localStore.setItem(keyId, hwData);
      await addAccountName({
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

    await localStore.setItem(KEY_ID, keyId);

    await sessionStore.dispatch(
      logIn({
        publicKey,
        mnemonicPhrase,
        allAccounts,
      }) as any,
    );

    // an active hw account should not have an active private key
    sessionStore.dispatch(setActivePrivateKey({ privateKey: "" }));
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

    const allAccounts = allAccountsSelector(sessionStore.getState());
    const accountName = `Account ${allAccounts.length + 1}`;

    await sessionStore.dispatch(
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
      }) as any,
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

    const keyIdListArr = await getKeyIdList();
    keyIdListArr.push(keyStore.id);

    await localStore.setItem(KEY_ID_LIST, keyIdListArr);
    await localStore.setItem(KEY_ID, keyStore.id);
    await addAccountName({
      keyId: keyStore.id,
      accountName,
    });
  };

  /*
    _replaceAccount is only used during the migration process. It is analagous to _storeAccount above.
    1. We login with the new account, which sets the new active public key and new allAccounts in Redux for the UI to consume
    2. We save the key store in storage
    3. We save the new account name in storage
  */
  const _replaceAccount = async ({
    mnemonicPhrase,
    password,
    keyPair,
    indexToReplace,
  }: {
    mnemonicPhrase: string;
    password: string;
    keyPair: KeyPair;
    indexToReplace: number;
  }) => {
    const { publicKey, privateKey } = keyPair;

    const allAccounts = allAccountsSelector(sessionStore.getState());
    const accountName = `Account ${indexToReplace + 1}`;
    const newAllAccounts = [...allAccounts];

    newAllAccounts[indexToReplace] = {
      publicKey,
      name: accountName,
      imported: false,
    };

    await sessionStore.dispatch(
      logIn({
        publicKey,
        mnemonicPhrase,
        allAccounts: newAllAccounts,
      }) as any,
    );

    const keyMetadata = {
      key: {
        extra: { imported: false, mnemonicPhrase },
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

    const keyIdListArr = await getKeyIdList();
    keyIdListArr[indexToReplace] = keyStore.id;

    await localStore.setItem(KEY_ID_LIST, keyIdListArr);
    await localStore.setItem(KEY_ID, keyStore.id);
    await addAccountName({
      keyId: keyStore.id,
      accountName,
    });
  };

  const _activatePublicKey = async ({ publicKey }: { publicKey: string }) => {
    const allAccounts = allAccountsSelector(sessionStore.getState());
    let publicKeyIndex = allAccounts.findIndex(
      (account: Account) => account.publicKey === publicKey,
    );
    publicKeyIndex = publicKeyIndex > -1 ? publicKeyIndex : 0;

    const keyIdList = await getKeyIdList();

    const activeKeyId = keyIdList[publicKeyIndex];

    await localStore.setItem(KEY_ID, activeKeyId);

    await sessionStore.dispatch(setActivePublicKey({ publicKey }) as any);
  };

  const fundAccount = async () => {
    const { publicKey } = request;

    const { friendbotUrl } = await getNetworkDetails();

    if (friendbotUrl) {
      try {
        await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`);
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

    await localStore.setItem(
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
    await localStore.setItem(
      APPLICATION_ID,
      APPLICATION_STATE.PASSWORD_CREATED,
    );

    const currentState = sessionStore.getState();

    return {
      allAccounts: allAccountsSelector(currentState),
      publicKey: publicKeySelector(currentState),
    };
  };

  const addAccount = async () => {
    const { password } = request;
    const mnemonicPhrase = mnemonicPhraseSelector(sessionStore.getState());

    if (!mnemonicPhrase) {
      return { error: "Mnemonic phrase not found" };
    }

    const keyID = (await getIsHardwareWalletActive())
      ? await _getNonHwKeyID()
      : (await localStore.getItem(KEY_ID)) || "";

    try {
      await _unlockKeystore({ keyID, password });
    } catch (e) {
      console.error(e);
      return { error: "Incorrect password" };
    }

    const wallet = fromMnemonic(mnemonicPhrase);
    const keyNumber =
      Number(await localStore.getItem(KEY_DERIVATION_NUMBER_ID)) + 1;

    const keyPair = {
      publicKey: wallet.getPublicKey(keyNumber),
      privateKey: wallet.getSecret(keyNumber),
    };

    await _storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
    });

    await localStore.setItem(KEY_DERIVATION_NUMBER_ID, keyNumber.toString());

    sessionStore.dispatch(timeoutAccountAccess());

    sessionTimer.startSession();
    sessionStore.dispatch(
      setActivePrivateKey({ privateKey: keyPair.privateKey }),
    );

    const currentState = sessionStore.getState();

    return {
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
      hasPrivateKey: await hasPrivateKeySelector(currentState),
    };
  };

  const importAccount = async () => {
    const { password, privateKey } = request;
    let sourceKeys;
    const keyID = (await getIsHardwareWalletActive())
      ? await _getNonHwKeyID()
      : (await localStore.getItem(KEY_ID)) || "";

    try {
      await _unlockKeystore({ keyID, password });
      sourceKeys = Keypair.fromSecret(privateKey);
    } catch (e) {
      console.error(e);
      return { error: "Please enter a valid secret key/password combination" };
    }

    const keyPair = {
      publicKey: sourceKeys.publicKey(),
      privateKey,
    };

    const mnemonicPhrase = mnemonicPhraseSelector(sessionStore.getState());

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
    sessionStore.dispatch(setActivePrivateKey({ privateKey }));

    const currentState = sessionStore.getState();

    return {
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
      hasPrivateKey: await hasPrivateKeySelector(currentState),
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
      publicKey: publicKeySelector(sessionStore.getState()),
      allAccounts: allAccountsSelector(sessionStore.getState()),
      hasPrivateKey: await hasPrivateKeySelector(sessionStore.getState()),
      bipPath: await getBipPath(),
    };
  };

  const makeAccountActive = async () => {
    const { publicKey } = request;
    await _activatePublicKey({ publicKey });

    sessionStore.dispatch(timeoutAccountAccess());

    const currentState = sessionStore.getState();

    return {
      publicKey: publicKeySelector(currentState),
      hasPrivateKey: await hasPrivateKeySelector(currentState),
      bipPath: await getBipPath(),
    };
  };

  const updateAccountName = async () => {
    const { accountName } = request;
    const keyId = (await localStore.getItem(KEY_ID)) || "";

    sessionStore.dispatch(
      updateAllAccountsAccountName({ updatedAccountName: accountName }),
    );
    await addAccountName({ keyId, accountName });

    return {
      allAccounts: allAccountsSelector(sessionStore.getState()),
    };
  };

  const addCustomNetwork = async () => {
    const { networkDetails } = request;
    const savedNetworks = await getSavedNetworks();

    // Network Name already used
    if (
      savedNetworks.find(
        ({ networkName }: { networkName: string }) =>
          networkName === networkDetails.networkName,
      )
    ) {
      return {
        error: "Network name is already in use",
      };
    }

    const networksList: NetworkDetails[] = [...savedNetworks, networkDetails];

    await localStore.setItem(NETWORKS_LIST_ID, networksList);

    return {
      networksList,
    };
  };

  const removeCustomNetwork = async () => {
    const { networkName } = request;

    const savedNetworks = await getSavedNetworks();
    const networkIndex = savedNetworks.findIndex(
      ({ networkName: savedNetworkName }) => savedNetworkName === networkName,
    );

    savedNetworks.splice(networkIndex, 1);

    await localStore.setItem(NETWORKS_LIST_ID, savedNetworks);

    return {
      networksList: savedNetworks,
    };
  };

  const editCustomNetwork = async () => {
    const { networkDetails, networkIndex } = request;

    const savedNetworks = await getSavedNetworks();
    const activeNetworkDetails =
      (await localStore.getItem(NETWORK_ID)) || MAINNET_NETWORK_DETAILS;
    const activeIndex =
      savedNetworks.findIndex(
        ({ networkName: savedNetworkName }) =>
          savedNetworkName === activeNetworkDetails.networkName,
      ) || 0;

    savedNetworks.splice(networkIndex, 1, networkDetails);

    await localStore.setItem(NETWORKS_LIST_ID, savedNetworks);

    if (activeIndex === networkIndex) {
      // editing active network, so we need to update this in storage
      await localStore.setItem(NETWORK_ID, savedNetworks[activeIndex]);
    }

    return {
      networksList: savedNetworks,
      networkDetails: savedNetworks[activeIndex],
    };
  };

  const changeNetwork = async () => {
    const { networkName } = request;
    const currentState = sessionStore.getState();

    const savedNetworks = await getSavedNetworks();
    const pubKey = publicKeySelector(currentState);
    const networkDetails =
      savedNetworks.find(
        ({ networkName: savedNetworkName }) => savedNetworkName === networkName,
      ) || MAINNET_NETWORK_DETAILS;

    await localStore.setItem(NETWORK_ID, networkDetails);
    await subscribeAccount(pubKey);

    const isRpcHealthy = await getIsRpcHealthy(networkDetails);

    return { networkDetails, isRpcHealthy };
  };

  const loadAccount = async () => {
    /*
    The 3.0.0 migration mistakenly sets keyId as a number in older versions.
    For some users, Chrome went right from version ~2.9.x to 3.0.0, which caused them to miss the below fix to the migration.
    This will fix this issue at load.

    keyId being of type number causes issues downstream:
    - we need to be able to use String.indexOf to determine if the keyId belongs to a hardware wallet
    - @stellar/walet-sdk expects a string when dealing unlocking a keystore by keyId
    - in other places in code where we save keyId, we do so as a string
    Let's solve the issue at its source
  */
    const keyId = (await localStore.getItem(KEY_ID)) as string | number;
    if (typeof keyId === "number") {
      await localStore.setItem(KEY_ID, keyId.toString());
    }

    const currentState = sessionStore.getState();

    return {
      hasPrivateKey: await hasPrivateKeySelector(currentState),
      publicKey: publicKeySelector(currentState),
      applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
      allAccounts: allAccountsSelector(currentState),
      bipPath: await getBipPath(),
      tokenIdList: (await localStore.getItem(TOKEN_ID_LIST)) || {},
    };
  };

  const getMnemonicPhrase = async () => {
    const { password } = request;

    const keyID = (await getIsHardwareWalletActive())
      ? await _getNonHwKeyID()
      : (await localStore.getItem(KEY_ID)) || "";

    try {
      await _unlockKeystore({ keyID, password });
    } catch (e) {
      console.error(e);
      return { error: "Incorrect password" };
    }
    return {
      mnemonicPhrase: mnemonicPhraseSelector(sessionStore.getState()),
    };
  };

  const confirmMnemonicPhrase = async () => {
    const isCorrectPhrase =
      mnemonicPhraseSelector(sessionStore.getState()) ===
      request.mnemonicPhraseToConfirm;

    const applicationState = isCorrectPhrase
      ? APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED
      : APPLICATION_STATE.MNEMONIC_PHRASE_FAILED;

    await localStore.setItem(APPLICATION_ID, applicationState);

    return {
      isCorrectPhrase,
      applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
    };
  };

  const confirmMigratedMnemonicPhrase = () => {
    const isCorrectPhrase =
      migratedMnemonicPhraseSelector(sessionStore.getState()) ===
      request.mnemonicPhraseToConfirm;

    return {
      isCorrectPhrase,
    };
  };

  const recoverAccount = async () => {
    const { password, recoverMnemonic } = request;
    let wallet;
    let applicationState;
    let error = "";

    try {
      wallet = fromMnemonic(recoverMnemonic);
    } catch (e) {
      console.error(e);
      error = "Invalid mnemonic phrase";
    }

    if (wallet) {
      const keyPair = {
        publicKey: wallet.getPublicKey(0),
        privateKey: wallet.getSecret(0),
      };
      localStore.clear();
      await localStore.setItem(KEY_DERIVATION_NUMBER_ID, "0");

      await _storeAccount({
        mnemonicPhrase: recoverMnemonic,
        password,
        keyPair,
      });

      // if we don't have an application state, assign them one
      applicationState =
        (await localStore.getItem(APPLICATION_ID)) ||
        APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

      await localStore.setItem(APPLICATION_ID, applicationState);

      // start the timer now that we have active private key
      sessionTimer.startSession();
      sessionStore.dispatch(
        setActivePrivateKey({ privateKey: keyPair.privateKey }),
      );

      // lets check first couple of accounts and pre-load them if funded on mainnet
      // eslint-disable-next-line no-restricted-syntax
      for (let i = 1; i <= numOfPublicKeysToCheck; i += 1) {
        try {
          const publicKey = wallet.getPublicKey(i);
          const privateKey = wallet.getSecret(i);

          // eslint-disable-next-line no-await-in-loop
          const resp = await fetch(
            `${MAINNET_NETWORK_DETAILS.networkUrl}/accounts/${publicKey}`,
          );
          // eslint-disable-next-line no-await-in-loop
          const j = await resp.json();
          if (j.account_id) {
            const newKeyPair = {
              publicKey,
              privateKey,
            };

            // eslint-disable-next-line no-await-in-loop
            await _storeAccount({
              password,
              keyPair: newKeyPair,
              mnemonicPhrase: recoverMnemonic,
              imported: true,
            });
            // eslint-disable-next-line no-await-in-loop
            await localStore.setItem(KEY_DERIVATION_NUMBER_ID, String(i));
          }
        } catch (e) {
          // continue
        }
      }

      // let's make the first public key the active one
      await _activatePublicKey({ publicKey: wallet.getPublicKey(0) });
    }

    const currentState = sessionStore.getState();

    return {
      allAccounts: allAccountsSelector(currentState),
      publicKey: publicKeySelector(currentState),
      applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
      hasPrivateKey: await hasPrivateKeySelector(currentState),
      error,
    };
  };

  const showBackupPhrase = async () => {
    const { password } = request;

    try {
      await _unlockKeystore({
        keyID: (await localStore.getItem(KEY_ID)) || "",
        password,
      });
    } catch (e) {
      return { error: "Incorrect Password" };
    }

    return {
      mnemonicPhrase: mnemonicPhraseSelector(sessionStore.getState()),
    };
  };

  const _getLocalStorageAccounts = async (password: string) => {
    const keyIdList = await getKeyIdList();
    const accountNameList = await getAccountNameList();
    const unlockedAccounts = [] as Account[];

    // for loop to preserve order of accounts
    // eslint-disable-next-line
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
    const keyIdList = await getKeyIdList();

    /* migration needed to v1.0.6-beta data model */
    if (!keyIdList.length) {
      const keyId = await localStore.getItem(KEY_ID);
      if (keyId) {
        keyIdList.push(keyId);
        await localStore.setItem(KEY_ID_LIST, keyIdList);
        await localStore.setItem(KEY_DERIVATION_NUMBER_ID, "0");
        await addAccountName({ keyId, accountName: "Account 1" });
      }
    }
    /* end migration script */

    // if active hw then use the first non-hw keyID to check password
    // with keyManager
    let keyID = (await localStore.getItem(KEY_ID)) || "";
    let hwPublicKey = "";
    if (await getIsHardwareWalletActive()) {
      hwPublicKey = keyID.split(":")[1];
      keyID = await _getNonHwKeyID();
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
      !publicKeySelector(sessionStore.getState()) ||
      !allAccountsSelector(sessionStore.getState()).length
    ) {
      // we have cleared redux store via reloading extension/browser
      // construct allAccounts from local storage
      // log the user in using all accounts and public key/phrase from above to create the store

      await sessionStore.dispatch(
        logIn({
          publicKey: hwPublicKey || activePublicKey,
          mnemonicPhrase: activeMnemonicPhrase,
          allAccounts: await _getLocalStorageAccounts(password),
        }) as any,
      );
    }

    // start the timer now that we have active private key
    sessionTimer.startSession();
    if (!(await getIsHardwareWalletActive())) {
      sessionStore.dispatch(
        setActivePrivateKey({ privateKey: activePrivateKey }),
      );
    }

    return {
      publicKey: publicKeySelector(sessionStore.getState()),
      hasPrivateKey: await hasPrivateKeySelector(sessionStore.getState()),
      applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
      allAccounts: allAccountsSelector(sessionStore.getState()),
      bipPath: await getBipPath(),
    };
  };

  const grantAccess = async () => {
    const { url = "" } = request;
    const sanitizedUrl = getUrlHostname(url);
    const punycodedDomain = getPunycodedDomain(sanitizedUrl);

    // TODO: right now we're just grabbing the last thing in the queue, but this should be smarter.
    // Maybe we need to search through responses to find a matching reponse :thinking_face
    const response = responseQueue.pop();
    const allowListStr = (await localStore.getItem(ALLOWLIST_ID)) || "";
    const allowList = allowListStr.split(",");
    allowList.push(punycodedDomain);

    await localStore.setItem(ALLOWLIST_ID, allowList.join());

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
    const privateKey = privateKeySelector(sessionStore.getState());

    if (privateKey.length) {
      const sourceKeys = Keypair.fromSecret(privateKey);

      let response;

      const transactionToSign = transactionQueue.pop();

      if (transactionToSign) {
        try {
          transactionToSign.sign(sourceKeys);
          response = transactionToSign.toXDR();
        } catch (e) {
          console.error(e);
          return { error: e };
        }
      }

      const transactionResponse = responseQueue.pop();

      if (typeof transactionResponse === "function") {
        transactionResponse(response);
        return {};
      }
    }

    return { error: "Session timed out" };
  };

  const signBlob = () => {
    const privateKey = privateKeySelector(sessionStore.getState());

    if (privateKey.length) {
      const sourceKeys = Keypair.fromSecret(privateKey);

      const blob = blobQueue.pop();
      const response = blob
        ? sourceKeys.sign(Buffer.from(blob.blob, "base64"))
        : null;

      const blobResponse = responseQueue.pop();

      if (typeof blobResponse === "function") {
        blobResponse(response);
        return {};
      }
    }

    return { error: "Session timed out" };
  };

  const signAuthEntry = () => {
    const privateKey = privateKeySelector(sessionStore.getState());

    if (privateKey.length) {
      const sourceKeys = Keypair.fromSecret(privateKey);
      const authEntry = authEntryQueue.pop();

      const response = authEntry
        ? sourceKeys.sign(hash(Buffer.from(authEntry.entry, "base64")))
        : null;

      const entryResponse = responseQueue.pop();

      if (typeof entryResponse === "function") {
        entryResponse(response);
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
    const transaction = TransactionBuilder.fromXDR(transactionXDR, network);

    const privateKey = privateKeySelector(sessionStore.getState());
    if (privateKey.length) {
      const sourceKeys = Keypair.fromSecret(privateKey);
      transaction.sign(sourceKeys);
      return { signedTransaction: transaction.toXDR() };
    }

    return { error: "Session timed out" };
  };

  const signFreighterSorobanTransaction = () => {
    const { transactionXDR, network } = request;

    const transaction = TransactionBuilder.fromXDR(transactionXDR, network);

    const privateKey = privateKeySelector(sessionStore.getState());
    if (privateKey.length) {
      const sourceKeys = Keypair.fromSecret(privateKey);
      transaction.sign(sourceKeys);
      return { signedTransaction: transaction.toXDR() };
    }

    return { error: "Session timed out" };
  };

  const addRecentAddress = async () => {
    const { publicKey } = request;
    const storedData = (await localStore.getItem(RECENT_ADDRESSES)) || [];
    const recentAddresses = storedData;
    if (recentAddresses.indexOf(publicKey) === -1) {
      recentAddresses.push(publicKey);
    }
    await localStore.setItem(RECENT_ADDRESSES, recentAddresses);

    return { recentAddresses };
  };

  const loadRecentAddresses = async () => {
    const storedData = (await localStore.getItem(RECENT_ADDRESSES)) || [];
    const recentAddresses = storedData;
    return { recentAddresses };
  };

  const signOut = async () => {
    sessionStore.dispatch(logOut());

    return {
      publicKey: publicKeySelector(sessionStore.getState()),
      applicationState: (await localStore.getItem(APPLICATION_ID)) || "",
    };
  };

  const saveAllowList = async () => {
    const { allowList } = request;

    await localStore.setItem(ALLOWLIST_ID, allowList.join());

    return {
      allowList: await getAllowList(),
    };
  };

  const saveSettings = async () => {
    const {
      isDataSharingAllowed,
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
      isValidatingSafeAssetsEnabled,
      isExperimentalModeEnabled,
    } = request;

    const currentIsExperimentalModeEnabled = await getIsExperimentalModeEnabled();

    await localStore.setItem(DATA_SHARING_ID, isDataSharingAllowed);
    await localStore.setItem(IS_VALIDATING_MEMO_ID, isMemoValidationEnabled);
    await localStore.setItem(
      IS_VALIDATING_SAFETY_ID,
      isSafetyValidationEnabled,
    );
    await localStore.setItem(
      IS_VALIDATING_SAFE_ASSETS_ID,
      isValidatingSafeAssetsEnabled,
    );

    if (isExperimentalModeEnabled !== currentIsExperimentalModeEnabled) {
      /* Disable Mainnet access and automatically switch the user to Futurenet
      if user is enabling experimental mode and vice-versa */
      const currentNetworksList = await getNetworksList();

      const defaultNetworkDetails = isExperimentalModeEnabled
        ? FUTURENET_NETWORK_DETAILS
        : MAINNET_NETWORK_DETAILS;

      currentNetworksList.splice(0, 1, defaultNetworkDetails);

      await localStore.setItem(NETWORKS_LIST_ID, currentNetworksList);
      await localStore.setItem(NETWORK_ID, defaultNetworkDetails);
    }

    await localStore.setItem(
      IS_EXPERIMENTAL_MODE_ID,
      isExperimentalModeEnabled,
    );

    const networkDetails = await getNetworkDetails();
    const isRpcHealthy = await getIsRpcHealthy(networkDetails);
    const featureFlags = await getFeatureFlags();

    return {
      allowList: await getAllowList(),
      isDataSharingAllowed,
      isMemoValidationEnabled: await getIsMemoValidationEnabled(),
      isSafetyValidationEnabled: await getIsSafetyValidationEnabled(),
      isValidatingSafeAssetsEnabled: await getIsValidatingSafeAssetsEnabled(),
      isExperimentalModeEnabled: await getIsExperimentalModeEnabled(),
      networkDetails,
      networksList: await getNetworksList(),
      isRpcHealthy,
      isSorobanPublicEnabled: featureFlags.useSorobanPublic,
    };
  };

  const loadSettings = async () => {
    await verifySorobanRpcUrls();

    const isDataSharingAllowed =
      (await localStore.getItem(DATA_SHARING_ID)) ?? true;
    const networkDetails = await getNetworkDetails();
    const featureFlags = await getFeatureFlags();
    const isRpcHealthy = await getIsRpcHealthy(networkDetails);
    const userNotification = await getUserNotification();

    return {
      allowList: await getAllowList(),
      isDataSharingAllowed,
      isMemoValidationEnabled: await getIsMemoValidationEnabled(),
      isSafetyValidationEnabled: await getIsSafetyValidationEnabled(),
      isValidatingSafeAssetsEnabled: await getIsValidatingSafeAssetsEnabled(),
      isExperimentalModeEnabled: await getIsExperimentalModeEnabled(),
      networkDetails: await getNetworkDetails(),
      networksList: await getNetworksList(),
      isSorobanPublicEnabled: featureFlags.useSorobanPublic,
      isRpcHealthy,
      userNotification,
    };
  };

  const getCachedAssetIcon = async () => {
    const { assetCanonical } = request;

    const assetIconCache =
      (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {};

    return {
      iconUrl: assetIconCache[assetCanonical] || "",
    };
  };

  const cacheAssetIcon = async () => {
    const { assetCanonical, iconUrl } = request;

    const assetIconCache =
      (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {};
    assetIconCache[assetCanonical] = iconUrl;
    await localStore.setItem(CACHED_ASSET_ICONS_ID, assetIconCache);
  };

  const getCachedAssetDomain = async () => {
    const { assetCanonical } = request;

    let assetDomainCache =
      (await localStore.getItem(CACHED_ASSET_DOMAINS_ID)) || {};

    // works around a 3.0.0 migration issue
    if (typeof assetDomainCache === "string") {
      assetDomainCache = JSON.parse(assetDomainCache);
    }

    return {
      iconUrl: assetDomainCache[assetCanonical] || "",
    };
  };

  const cacheAssetDomain = async () => {
    const { assetCanonical, assetDomain } = request;

    let assetDomainCache =
      (await localStore.getItem(CACHED_ASSET_DOMAINS_ID)) || {};

    // works around a 3.0.0 migration issue
    if (typeof assetDomainCache === "string") {
      assetDomainCache = JSON.parse(assetDomainCache);
    }

    assetDomainCache[assetCanonical] = assetDomain;
    await localStore.setItem(CACHED_ASSET_DOMAINS_ID, assetDomainCache);
  };

  const getBlockedDomains = async () => {
    try {
      const resp = await cachedFetch(
        STELLAR_EXPERT_BLOCKED_DOMAINS_URL,
        CACHED_BLOCKED_DOMAINS_ID,
      );
      const blockedDomains = (resp?._embedded?.records || []).reduce(
        (bd: BlockedDomains, obj: { domain: string }) => {
          const map = bd;
          map[obj.domain] = true;
          return map;
        },
        {},
      );
      return { blockedDomains };
    } catch (e) {
      console.error(e);
      return new Error("Error getting blocked domains");
    }
  };

  const getBlockedAccounts = async () => {
    try {
      const resp = await cachedFetch(
        STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL,
        CACHED_BLOCKED_ACCOUNTS_ID,
      );
      const blockedAccounts: BlockedAccount[] = resp?._embedded?.records || [];
      return { blockedAccounts };
    } catch (e) {
      console.error(e);
      return new Error("Error getting blocked accounts");
    }
  };

  const resetExperimentalData = async () => {
    if (EXPERIMENTAL !== true) {
      return { error: "Not in experimental mode" };
    }
    await localStore.clear();
    sessionStore.dispatch(reset());
    return {};
  };

  const addTokenId = async () => {
    const { tokenId, network, publicKey } = request;
    const tokenIdsByNetwork = (await localStore.getItem(TOKEN_ID_LIST)) || {};
    const tokenIdList = tokenIdsByNetwork[network] || {};
    const keyId = (await localStore.getItem(KEY_ID)) || "";

    const accountTokenIdList = tokenIdList[keyId] || [];

    if (accountTokenIdList.includes(tokenId)) {
      return { error: "Token ID already exists" };
    }

    try {
      await subscribeTokenBalance(publicKey, tokenId);
      await subscribeTokenHistory(publicKey, tokenId);

      accountTokenIdList.push(tokenId);
      await localStore.setItem(TOKEN_ID_LIST, {
        ...tokenIdsByNetwork,
        [network]: {
          ...tokenIdList,
          [keyId]: accountTokenIdList,
        },
      });
    } catch (error) {
      console.error(error);
      return { error: "Failed to subscribe to token details" };
    }

    return { accountTokenIdList };
  };

  const getTokenIds = async () => {
    const { network } = request;
    const tokenIdsByNetwork = (await localStore.getItem(TOKEN_ID_LIST)) || {};
    const tokenIdsByKey = tokenIdsByNetwork[network] || {};
    const keyId = (await localStore.getItem(KEY_ID)) || "";

    return { tokenIdList: tokenIdsByKey[keyId] || [] };
  };

  const removeTokenId = async () => {
    const { contractId, network } = request;

    const tokenIdsList = (await localStore.getItem(TOKEN_ID_LIST)) || {};
    const tokenIdsByNetwork = tokenIdsList[network] || {};
    const keyId = (await localStore.getItem(KEY_ID)) || "";

    const accountTokenIdList = tokenIdsByNetwork[keyId] || [];
    const updatedTokenIdList = accountTokenIdList.filter(
      (id: string) => id !== contractId,
    );

    await localStore.setItem(TOKEN_ID_LIST, {
      ...tokenIdsList,
      [network]: {
        [keyId]: updatedTokenIdList,
      },
    });

    return { tokenIdList: updatedTokenIdList };
  };

  const getMigratableAccounts = async () => {
    const keyIdList = (await getKeyIdList()) as string[];

    const mnemonicPhrase = mnemonicPhraseSelector(sessionStore.getState());
    const allAccounts = allAccountsSelector(sessionStore.getState());
    const wallet = fromMnemonic(mnemonicPhrase);

    const mnemonicPublicKeyArr: string[] = [];

    // a bit of brute force; we'll check the number of keyIds the user has plus the number of keyIds we auto-import.
    const numberOfKeyIdsToCheck = keyIdList.length + numOfPublicKeysToCheck;

    for (let i = 0; i < numberOfKeyIdsToCheck; i += 1) {
      mnemonicPublicKeyArr.push(wallet.getPublicKey(i));
    }

    // only use accounts that were derived from the mnemonic phrase
    const migratableAccounts: MigratableAccount[] = [];

    allAccounts.forEach((acct, i) => {
      if (mnemonicPublicKeyArr.includes(acct.publicKey)) {
        migratableAccounts.push({ ...acct, keyIdIndex: i });
      }
    });

    return {
      migratableAccounts,
    };
  };

  const getMigratedMnemonicPhrase = () => {
    const migratedMnemonicPhrase = generateMnemonic({ entropyBits: 128 });

    sessionStore.dispatch(
      setMigratedMnemonicPhrase({ migratedMnemonicPhrase }),
    );

    return { mnemonicPhrase: migratedMnemonicPhrase };
  };

  const migrateAccounts = async () => {
    const { balancesToMigrate, isMergeSelected, recommendedFee } = request;

    const migratedMnemonicPhrase = migratedMnemonicPhraseSelector(
      sessionStore.getState(),
    );
    const migratedAccounts = [];

    const password = passwordSelector(sessionStore.getState());
    if (!password || !migratedMnemonicPhrase) {
      return { error: "Authentication error" };
    }

    const newWallet = fromMnemonic(migratedMnemonicPhrase);
    const keyIdList: string = await getKeyIdList();
    const fee = xlmToStroop(recommendedFee).toFixed();

    // we expect all migrations to be done on MAINNET
    const server = stellarSdkServer(NETWORK_URLS.PUBLIC);
    const networkPassphrase = Networks.PUBLIC;

    /*
      For each migratable balance, we'll go through the following steps:
      1. We create a new keypair that will be the destination account
      2. We send the minimum amount of XLM needed to create the destination acct and also provide
        enough funds to create necessary trustlines
      3. Replace the old source account with the destination account in redux and in local storage.
        When the user refreshes the app, they will already be logged into their new accounts.
      4. Migrate the trustlines from the source account to destination
      5. Start an account session with the destination account so the user can start signing tx's with their newly migrated account
    */

    // eslint-disable-next-line
    for (let i = 0; i < balancesToMigrate.length; i += 1) {
      const {
        publicKey,
        xlmBalance,
        minBalance,
        trustlineBalances,
        keyIdIndex,
      } = balancesToMigrate[i];
      const migratedAccount = {
        ...balancesToMigrate[i],
        newPublicKey: "",
        isMigrated: true,
      };

      const keyID = keyIdList[keyIdIndex];

      // eslint-disable-next-line no-await-in-loop
      const store = await _unlockKeystore({ password, keyID });

      // eslint-disable-next-line no-await-in-loop
      const sourceAccount = await server.loadAccount(publicKey);

      // create a new keystore and migrate while replacing the keyId in the list
      const newKeyPair = {
        publicKey: newWallet.getPublicKey(keyIdIndex),
        privateKey: newWallet.getSecret(keyIdIndex),
      };

      // eslint-disable-next-line no-await-in-loop
      const transaction = new TransactionBuilder(sourceAccount, {
        fee,
        networkPassphrase,
      });

      // the amount the sender needs to hold to complete the migration
      const senderAccountMinBal = calculateSenderMinBalance({
        minBalance,
        recommendedFee,
        trustlineBalancesLength: trustlineBalances.length,
        isMergeSelected,
      });

      const startingBalance = new BigNumber(xlmBalance)
        .minus(senderAccountMinBal)
        .toString();

      transaction.addOperation(
        Operation.createAccount({
          destination: newKeyPair.publicKey,
          startingBalance,
        }),
      );

      const sourceKeys = Keypair.fromSecret(store.privateKey);
      const builtTransaction = transaction.setTimeout(180).build();

      try {
        builtTransaction.sign(sourceKeys);
      } catch (e) {
        console.error(e);
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        await submitTx({ server, tx: builtTransaction });
      } catch (e) {
        console.error(e);
        migratedAccount.isMigrated = false;
      }

      // if the preceding step has failed, this will fail as well. Don't bother making the API call
      if (migratedAccount.isMigrated) {
        try {
          // now that the destination accounts are funded, we can add the trustline balances
          // eslint-disable-next-line no-await-in-loop
          await migrateTrustlines({
            trustlineBalances,
            server,
            newKeyPair,
            fee,
            sourceAccount,
            sourceKeys,
            isMergeSelected,
            networkPassphrase,
          });
        } catch (e) {
          console.error(e);
          migratedAccount.isMigrated = false;
        }
      }

      // if any of the preceding steps have failed, this will fail as well. Don't bother making the API call
      if (isMergeSelected && migratedAccount.isMigrated) {
        // since we're doing a merge, we can merge the old account into the new one, which will delete the old account
        // eslint-disable-next-line no-await-in-loop
        const mergeTransaction = new TransactionBuilder(sourceAccount, {
          fee,
          networkPassphrase,
        });
        mergeTransaction.addOperation(
          Operation.accountMerge({
            destination: newKeyPair.publicKey,
          }),
        );

        const builtMergeTransaction = mergeTransaction.setTimeout(180).build();

        try {
          builtMergeTransaction.sign(sourceKeys);
        } catch (e) {
          console.error(e);
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          await submitTx({ server, tx: builtMergeTransaction });
        } catch (e) {
          console.error(e);
          migratedAccount.isMigrated = false;
        }
      }

      if (migratedAccount.isMigrated) {
        // replace the source account with the new one in `allAccounts` and store the keys
        // eslint-disable-next-line no-await-in-loop
        await _replaceAccount({
          mnemonicPhrase: migratedMnemonicPhrase,
          password,
          keyPair: newKeyPair,
          indexToReplace: keyIdIndex,
        });
      }

      migratedAccount.newPublicKey = newKeyPair.publicKey;
      migratedAccounts.push(migratedAccount);
    }

    const successfullyMigratedAccts = migratedAccounts.filter(
      ({ isMigrated }) => isMigrated,
    );

    // if any of the accounts have been successfully migrated, go ahead and log in
    if (successfullyMigratedAccts.length) {
      // let's make the first public key the active one
      await _activatePublicKey({ publicKey: newWallet.getPublicKey(0) });

      sessionStore.dispatch(timeoutAccountAccess());

      sessionTimer.startSession();
      sessionStore.dispatch(
        setActivePrivateKey({ privateKey: newWallet.getSecret(0) }),
      );
    }

    const currentState = sessionStore.getState();

    return {
      migratedAccounts,
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
      hasPrivateKey: await hasPrivateKeySelector(currentState),
    };
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
    [SERVICE_TYPES.REMOVE_CUSTOM_NETWORK]: removeCustomNetwork,
    [SERVICE_TYPES.EDIT_CUSTOM_NETWORK]: editCustomNetwork,
    [SERVICE_TYPES.CHANGE_NETWORK]: changeNetwork,
    [SERVICE_TYPES.GET_MNEMONIC_PHRASE]: getMnemonicPhrase,
    [SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE]: confirmMnemonicPhrase,
    [SERVICE_TYPES.CONFIRM_MIGRATED_MNEMONIC_PHRASE]: confirmMigratedMnemonicPhrase,
    [SERVICE_TYPES.RECOVER_ACCOUNT]: recoverAccount,
    [SERVICE_TYPES.CONFIRM_PASSWORD]: confirmPassword,
    [SERVICE_TYPES.GRANT_ACCESS]: grantAccess,
    [SERVICE_TYPES.REJECT_ACCESS]: rejectAccess,
    [SERVICE_TYPES.SIGN_TRANSACTION]: signTransaction,
    [SERVICE_TYPES.SIGN_BLOB]: signBlob,
    [SERVICE_TYPES.SIGN_AUTH_ENTRY]: signAuthEntry,
    [SERVICE_TYPES.HANDLE_SIGNED_HW_TRANSACTION]: handleSignedHwTransaction,
    [SERVICE_TYPES.REJECT_TRANSACTION]: rejectTransaction,
    [SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION]: signFreighterTransaction,
    [SERVICE_TYPES.SIGN_FREIGHTER_SOROBAN_TRANSACTION]: signFreighterSorobanTransaction,
    [SERVICE_TYPES.ADD_RECENT_ADDRESS]: addRecentAddress,
    [SERVICE_TYPES.LOAD_RECENT_ADDRESSES]: loadRecentAddresses,
    [SERVICE_TYPES.SIGN_OUT]: signOut,
    [SERVICE_TYPES.SHOW_BACKUP_PHRASE]: showBackupPhrase,
    [SERVICE_TYPES.SAVE_ALLOWLIST]: saveAllowList,
    [SERVICE_TYPES.SAVE_SETTINGS]: saveSettings,
    [SERVICE_TYPES.LOAD_SETTINGS]: loadSettings,
    [SERVICE_TYPES.GET_CACHED_ASSET_ICON]: getCachedAssetIcon,
    [SERVICE_TYPES.CACHE_ASSET_ICON]: cacheAssetIcon,
    [SERVICE_TYPES.GET_CACHED_ASSET_DOMAIN]: getCachedAssetDomain,
    [SERVICE_TYPES.CACHE_ASSET_DOMAIN]: cacheAssetDomain,
    [SERVICE_TYPES.GET_BLOCKED_DOMAINS]: getBlockedDomains,
    [SERVICE_TYPES.RESET_EXP_DATA]: resetExperimentalData,
    [SERVICE_TYPES.ADD_TOKEN_ID]: addTokenId,
    [SERVICE_TYPES.GET_TOKEN_IDS]: getTokenIds,
    [SERVICE_TYPES.REMOVE_TOKEN_ID]: removeTokenId,
    [SERVICE_TYPES.GET_BLOCKED_ACCOUNTS]: getBlockedAccounts,
    [SERVICE_TYPES.GET_MIGRATABLE_ACCOUNTS]: getMigratableAccounts,
    [SERVICE_TYPES.GET_MIGRATED_MNEMONIC_PHRASE]: getMigratedMnemonicPhrase,
    [SERVICE_TYPES.MIGRATE_ACCOUNTS]: migrateAccounts,
  };

  return messageResponder[request.type]();
};

/* eslint-enable @typescript-eslint/no-unsafe-argument */
