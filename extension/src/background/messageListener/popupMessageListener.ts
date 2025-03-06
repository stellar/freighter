import { BigNumber } from "bignumber.js";
import { Store } from "redux";
import * as StellarSdk from "stellar-sdk";
// @ts-ignore
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";
import {
  KeyManager,
  BrowserStorageKeyStore,
  ScryptEncrypter,
  KeyType,
} from "@stellar/typescript-wallet-sdk-km";
import { BrowserStorageConfigParams } from "@stellar/typescript-wallet-sdk-km/lib/Plugins/BrowserStorageFacade";

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
  MemoRequiredAccount,
  MigratableAccount,
} from "@shared/api/types";
import { MessageResponder } from "background/types";

import {
  ALLOWLIST_ID,
  ACCOUNT_NAME_LIST_ID,
  APPLICATION_ID,
  ASSETS_LISTS_ID,
  CACHED_ASSET_ICONS_ID,
  CACHED_ASSET_DOMAINS_ID,
  DATA_SHARING_ID,
  IS_VALIDATING_MEMO_ID,
  IS_EXPERIMENTAL_MODE_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
  RECENT_ADDRESSES,
  LAST_USED_ACCOUNT,
  CACHED_MEMO_REQUIRED_ACCOUNTS_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  TOKEN_ID_LIST,
  IS_HASH_SIGNING_ENABLED_ID,
  IS_NON_SSL_ENABLED_ID,
  IS_HIDE_DUST_ENABLED_ID,
  TEMPORARY_STORE_ID,
  TEMPORARY_STORE_EXTRA_ID,
} from "constants/localStorageTypes";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
  NETWORK_URLS,
} from "@shared/constants/stellar";

import { EXPERIMENTAL } from "constants/featureFlag";
import {
  EntryToSign,
  getPunycodedDomain,
  getUrlHostname,
  MessageToSign,
  TokenToAdd,
} from "helpers/urls";
import {
  addAccountName,
  getAccountNameList,
  getAllowList,
  getKeyIdList,
  getIsMemoValidationEnabled,
  getIsExperimentalModeEnabled,
  getIsHashSigningEnabled,
  getIsHardwareWalletActive,
  getIsRpcHealthy,
  getUserNotification,
  getSavedNetworks,
  getNetworkDetails,
  getNetworksList,
  getAssetsLists,
  getIsNonSSLEnabled,
  getIsHideDustEnabled,
  HW_PREFIX,
  getBipPath,
  subscribeTokenBalance,
  subscribeAccount,
  subscribeTokenHistory,
  getFeatureFlags,
  verifySorobanRpcUrls,
} from "background/helpers/account";
import {
  SessionTimer,
  deriveKeyFromString,
  getEncryptedTemporaryData,
  storeEncryptedTemporaryData,
  getActiveHashKeyCryptoKey,
  storeActiveHashKey,
  clearSession,
} from "background/helpers/session";
import { cachedFetch } from "background/helpers/cachedFetch";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorageAccess";
import { migrateTrustlines } from "background/helpers/migration";
import { xlmToStroop } from "helpers/stellar";

import {
  allAccountsSelector,
  hasPrivateKeySelector,
  logIn,
  logOut,
  migratedMnemonicPhraseSelector,
  publicKeySelector,
  setActivePublicKey,
  updateAllAccountsAccountName,
  reset,
  setMigratedMnemonicPhrase,
} from "background/ducks/session";
import { STELLAR_EXPERT_MEMO_REQUIRED_ACCOUNTS_URL } from "background/constants/apiUrls";
import {
  AssetsListKey,
  DEFAULT_ASSETS_LISTS,
} from "@shared/constants/soroban/asset-list";
import { getSdk } from "@shared/helpers/stellar";
import { captureException } from "@sentry/browser";

// number of public keys to auto-import
const numOfPublicKeysToCheck = 5;
const sessionTimer = new SessionTimer();

export const responseQueue: Array<
  (message?: any, messageAddress?: any, signature?: any) => void
> = [];

export const transactionQueue: StellarSdk.Transaction[] = [];

export const tokenQueue: TokenToAdd[] = [];

export const blobQueue: MessageToSign[] = [];

export const authEntryQueue: EntryToSign[] = [];

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const popupMessageListener = (request: Request, sessionStore: Store) => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const localKeyStore = new BrowserStorageKeyStore();
  // ts-wallet-sdk storage area definition clashes with webkit polyfills
  localKeyStore.configure({
    storage:
      browserLocalStorage as any as BrowserStorageConfigParams["storage"],
  });
  const keyManager = new KeyManager({
    keyStore: localKeyStore,
  });
  keyManager.registerEncrypter(ScryptEncrypter);

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
        allAccounts,
      }) as any,
    );
  };

  /* Append an additional account to user's account list */
  const _storeAccount = async ({
    mnemonicPhrase,
    password,
    keyPair,
    imported = false,
    isSettingHashKey = false,
  }: {
    mnemonicPhrase: string;
    password: string;
    keyPair: KeyPair;
    imported?: boolean;
    isSettingHashKey?: boolean;
  }) => {
    const { publicKey, privateKey } = keyPair;

    const allAccounts = allAccountsSelector(sessionStore.getState());
    const accountName = `Account ${allAccounts.length + 1}`;

    let activeHashKey = await getActiveHashKeyCryptoKey({ sessionStore });
    if (activeHashKey === null && isSettingHashKey) {
      // this should only happen on account creation & account recovery
      activeHashKey = await deriveKeyFromString(password);
    }

    if (activeHashKey === null) {
      throw new Error("Error deriving hash key");
    }

    // set the active public key
    await sessionStore.dispatch(
      logIn({
        publicKey,
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
      encrypterName: ScryptEncrypter.name,
    };

    let keyStore = { id: "" };

    // store encrypted extra data

    keyStore = await keyManager.storeKey(keyMetadata);
    await storeEncryptedTemporaryData({
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
      temporaryData: mnemonicPhrase,
      hashKey: activeHashKey,
    });

    // store encrypted keypair data
    await storeEncryptedTemporaryData({
      localStore,
      keyName: keyStore.id,
      temporaryData: keyPair.privateKey,
      hashKey: activeHashKey,
    });

    await storeActiveHashKey({
      sessionStore,
      hashKey: activeHashKey,
    });

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
      encrypterName: ScryptEncrypter.name,
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
    const keyId = KEY_DERIVATION_NUMBER.toString();

    await localStore.setItem(KEY_DERIVATION_NUMBER_ID, keyId);

    const keyPair = {
      publicKey: wallet.getPublicKey(KEY_DERIVATION_NUMBER),
      privateKey: wallet.getSecret(KEY_DERIVATION_NUMBER),
    };

    await clearSession({ localStore, sessionStore });

    try {
      await _storeAccount({
        password,
        keyPair,
        mnemonicPhrase,
        isSettingHashKey: true,
      });
    } catch (e) {
      console.error(e);
      captureException(`Error creating account: ${JSON.stringify(e)}`);
      return { error: "Error creating account" };
    }

    await localStore.setItem(
      APPLICATION_ID,
      APPLICATION_STATE.PASSWORD_CREATED,
    );

    const currentState = sessionStore.getState();

    sessionTimer.startSession();

    return {
      allAccounts: allAccountsSelector(currentState),
      publicKey: publicKeySelector(currentState),
      hasPrivateKey: await hasPrivateKeySelector(currentState),
    };
  };

  const addAccount = async () => {
    const password = request.password;

    let mnemonicPhrase = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });

    if (!mnemonicPhrase) {
      try {
        await loginToAllAccounts(password);
        mnemonicPhrase = await getEncryptedTemporaryData({
          sessionStore,
          localStore,
          keyName: TEMPORARY_STORE_EXTRA_ID,
        });
      } catch (e) {
        captureException(
          `Error logging in to all accounts in Add Account - ${JSON.stringify(
            e,
          )}`,
        );
        return { error: "Unable to login" };
      }
    }

    const keyID = (await getIsHardwareWalletActive())
      ? await _getNonHwKeyID()
      : (await localStore.getItem(KEY_ID)) || "";

    // if the session is active, confirm that the password is correct and the hashkey properly unlocks
    let activePrivateKey = "";
    try {
      await _unlockKeystore({ keyID, password });
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
      await _storeAccount({
        password,
        keyPair,
        mnemonicPhrase,
      });
    } catch (e) {
      await clearSession({ localStore, sessionStore });
      captureException(`Error adding account: ${JSON.stringify(e)}`);
      return { error: "Error adding account" };
    }

    const keyId = keyNumber.toString();
    await localStore.setItem(KEY_DERIVATION_NUMBER_ID, keyId);

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

    let mnemonicPhrase = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });

    if (!mnemonicPhrase) {
      try {
        await loginToAllAccounts(password);
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
      ? await _getNonHwKeyID()
      : (await localStore.getItem(KEY_ID)) || "";
    // if the session is active, confirm that the password is correct and the hashkey properly unlocks
    let activePrivateKey = "";

    try {
      await _unlockKeystore({ keyID, password });
      activePrivateKey = await getEncryptedTemporaryData({
        sessionStore,
        localStore,
        keyName: keyID,
      });
      sourceKeys = StellarSdk.Keypair.fromSecret(privateKey);
    } catch (e) {
      console.error(e);
      return { error: "Please enter a valid secret key/password combination" };
    }

    const keyPair = {
      publicKey: sourceKeys.publicKey(),
      privateKey,
    };

    try {
      await _storeAccount({
        password,
        keyPair,
        mnemonicPhrase,
        imported: true,
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

    let mnemonicPhrase = "";

    try {
      await _unlockKeystore({ keyID, password });
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

  const confirmMnemonicPhrase = async () => {
    const mnemonicPhrase = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });
    const isCorrectPhrase = mnemonicPhrase === request.mnemonicPhraseToConfirm;

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

      // resets accounts list
      sessionStore.dispatch(reset());

      const keyIdList = await getKeyIdList();

      if (keyIdList.length) {
        /* Clear any existing account data while maintaining app settings */

        for (let i = 0; i < keyIdList.length; i += 1) {
          await localStore.remove(`stellarkeys:${keyIdList[i]}`);
        }

        await localStore.setItem(KEY_ID_LIST, []);
        await localStore.remove(ACCOUNT_NAME_LIST_ID);
      }

      await localStore.setItem(KEY_DERIVATION_NUMBER_ID, "0");

      await clearSession({ localStore, sessionStore });

      try {
        await _storeAccount({
          mnemonicPhrase: recoverMnemonic,
          password,
          keyPair,
          isSettingHashKey: true,
        });
      } catch (e) {
        captureException(`Error recovering account: ${JSON.stringify(e)}`);
      }

      // if we don't have an application state, assign them one
      applicationState =
        (await localStore.getItem(APPLICATION_ID)) ||
        APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

      await localStore.setItem(APPLICATION_ID, applicationState);

      // lets check first couple of accounts and pre-load them if funded on mainnet

      for (let i = 1; i <= numOfPublicKeysToCheck; i += 1) {
        try {
          const publicKey = wallet.getPublicKey(i);
          const privateKey = wallet.getSecret(i);

          const resp = await fetch(
            `${MAINNET_NETWORK_DETAILS.networkUrl}/accounts/${publicKey}`,
          );

          const j = await resp.json();
          if (j.account_id) {
            const newKeyPair = {
              publicKey,
              privateKey,
            };

            await _storeAccount({
              password,
              keyPair: newKeyPair,
              mnemonicPhrase: recoverMnemonic,
              imported: true,
            });

            await localStore.setItem(KEY_DERIVATION_NUMBER_ID, String(i));
          }
        } catch (e) {
          captureException(
            `Error preloading account: ${JSON.stringify(e)} - ${i}`,
          );
          // continue
        }
      }

      // let's make the first public key the active one
      await _activatePublicKey({ publicKey: wallet.getPublicKey(0) });

      // start the timer now that we have active private key
      sessionTimer.startSession();
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

    let mnemonicPhrase = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });

    if (!mnemonicPhrase) {
      try {
        await loginToAllAccounts(password);
        mnemonicPhrase = await getEncryptedTemporaryData({
          sessionStore,
          localStore,
          keyName: TEMPORARY_STORE_EXTRA_ID,
        });
      } catch (e) {
        return { error: "Incorrect password" };
      }
    }

    return {
      mnemonicPhrase,
    };
  };

  const _getLocalStorageAccounts = async (password: string) => {
    const keyIdList = await getKeyIdList();
    const accountNameList = await getAccountNameList();
    const unlockedAccounts = [] as Account[];

    // for loop to preserve order of accounts

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

  /* Retrive and store encrypted data for all existing accounts */
  const loginToAllAccounts = async (password: string) => {
    const keyIdList = await getKeyIdList();

    // if active hw then use the first non-hw keyID to check password
    // with keyManager
    let keyID = (await localStore.getItem(KEY_ID)) || "";
    let hwPublicKey = "";
    if (await getIsHardwareWalletActive()) {
      hwPublicKey = keyID.split(":")[1];
      keyID = await _getNonHwKeyID();
    }

    // first make sure the password is correct to get active keystore, short circuit if not
    const activeAccountKeystore = await _unlockKeystore({
      keyID,
      password,
    });

    const {
      publicKey: activePublicKey,
      extra: activeExtra = { mnemonicPhrase: "" },
    } = activeAccountKeystore;

    const activeMnemonicPhrase = activeExtra.mnemonicPhrase;
    const hashKey = await deriveKeyFromString(password);

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
          allAccounts: await _getLocalStorageAccounts(password),
        }) as any,
      );
    }

    // clear the temporary store (if it exists) so we can replace it with the new encrypted data
    await localStore.remove(TEMPORARY_STORE_ID);

    try {
      await storeEncryptedTemporaryData({
        localStore,
        keyName: TEMPORARY_STORE_EXTRA_ID,
        temporaryData: activeMnemonicPhrase,
        hashKey,
      });
    } catch (e) {
      await clearSession({ localStore, sessionStore });
      captureException(
        `Error storing encrypted temporary data: ${JSON.stringify(e)}`,
      );
    }

    for (let i = 0; i < keyIdList.length; i += 1) {
      const currentKeyId = keyIdList[i];

      if (!currentKeyId.includes(HW_PREFIX)) {
        const keyStoreToUnlock = await _unlockKeystore({
          keyID: keyIdList[i],
          password,
        });

        try {
          await storeEncryptedTemporaryData({
            localStore,
            keyName: keyIdList[i],
            temporaryData: keyStoreToUnlock.privateKey,
            hashKey,
          });
        } catch (e) {
          captureException(
            `Error storing encrypted temporary data: ${JSON.stringify(
              e,
            )} - ${JSON.stringify(keyIdList)}: ${i}`,
          );
        }
      }
    }

    try {
      await storeActiveHashKey({
        sessionStore,
        hashKey,
      });
    } catch (e) {
      await clearSession({ localStore, sessionStore });
      captureException(`Error storing active hash key: ${JSON.stringify(e)}`);
    }

    // start the timer now that we have active private key
    sessionTimer.startSession();
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

    try {
      await loginToAllAccounts(password);
    } catch (e) {
      return { error: "Incorrect password" };
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

  const handleSignedHwPayload = () => {
    const { signedPayload } = request;

    const transactionResponse = responseQueue.pop();

    if (typeof transactionResponse === "function") {
      transactionResponse(signedPayload);
      return {};
    }

    return { error: "Session timed out" };
  };

  const addToken = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());
    const networkDetails = await getNetworkDetails();

    if (publicKey.length) {
      const tokenInfo = tokenQueue.pop();

      if (!tokenInfo?.contractId) {
        throw Error("Missing contract id");
      }

      const response = await addTokenWithContractId({
        contractId: tokenInfo.contractId,
        network: networkDetails.network,
        publicKey,
      });

      const tokenResponse = responseQueue.pop();

      if (typeof tokenResponse === "function") {
        // We're only interested here if it was a success or not
        tokenResponse(!response.error);
        return {};
      }
    }

    return { error: "Session timed out" };
  };

  const signTransaction = async () => {
    const keyId = (await localStore.getItem(KEY_ID)) || "";
    let privateKey = "";

    try {
      privateKey = await getEncryptedTemporaryData({
        localStore,
        sessionStore,
        keyName: keyId,
      });
    } catch (e) {
      captureException(
        `Sign transaction: No private key found: ${JSON.stringify(e)}`,
      );
    }

    const networkDetails = await getNetworkDetails();

    const Sdk = getSdk(networkDetails.networkPassphrase);

    if (privateKey.length) {
      const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
      let signedTransaction;
      let signature;

      const transactionToSign = transactionQueue.pop();

      if (transactionToSign) {
        try {
          transactionToSign.sign(sourceKeys);
          signedTransaction = transactionToSign.toXDR();

          // Make sure to get the last signature which we've just added
          // since the XDR transaction could have multiple signatures
          const signatureList = transactionToSign.signatures;
          const lastSignature = signatureList[signatureList.length - 1];
          signature = lastSignature.signature().toString("hex");
        } catch (e) {
          console.error(e);
          return { error: e };
        }
      }

      const transactionResponse = responseQueue.pop();

      if (typeof transactionResponse === "function") {
        transactionResponse(
          signedTransaction,
          sourceKeys.publicKey(),
          signature,
        );
        return {};
      }
    }

    return { error: "Session timed out" };
  };

  const signBlob = async () => {
    const keyId = (await localStore.getItem(KEY_ID)) || "";
    let privateKey = "";

    try {
      privateKey = await getEncryptedTemporaryData({
        localStore,
        sessionStore,
        keyName: keyId,
      });
    } catch (e) {
      captureException(`Sign blob: No private key found: ${JSON.stringify(e)}`);
    }

    const networkDetails = await getNetworkDetails();

    const Sdk = getSdk(networkDetails.networkPassphrase);

    if (privateKey.length) {
      const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
      const blob = blobQueue.pop();

      const response = blob
        ? sourceKeys.sign(Buffer.from(blob.message, "base64"))
        : null;

      const blobResponse = responseQueue.pop();

      if (typeof blobResponse === "function") {
        blobResponse(response, sourceKeys.publicKey());
        return {};
      }
    }

    return { error: "Session timed out" };
  };

  const signAuthEntry = async () => {
    const keyId = (await localStore.getItem(KEY_ID)) || "";
    let privateKey = "";

    try {
      privateKey = await getEncryptedTemporaryData({
        localStore,
        sessionStore,
        keyName: keyId,
      });
    } catch (e) {
      captureException(
        `Sign auth entry: No private key found: ${JSON.stringify(e)}`,
      );
    }

    const networkDetails = await getNetworkDetails();

    const Sdk = getSdk(networkDetails.networkPassphrase);

    if (privateKey.length) {
      const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
      const authEntry = authEntryQueue.pop();

      const response = authEntry
        ? sourceKeys.sign(Sdk.hash(Buffer.from(authEntry.entry, "base64")))
        : null;

      const entryResponse = responseQueue.pop();

      if (typeof entryResponse === "function") {
        entryResponse(response, sourceKeys.publicKey());
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

  const signFreighterTransaction = async () => {
    const { transactionXDR, network } = request;

    const Sdk = getSdk(network);

    const transaction = Sdk.TransactionBuilder.fromXDR(transactionXDR, network);
    const keyId = (await localStore.getItem(KEY_ID)) || "";
    let privateKey = "";
    try {
      privateKey = await getEncryptedTemporaryData({
        localStore,
        sessionStore,
        keyName: keyId,
      });
    } catch (e) {
      captureException(
        `Sign freighter transaction: No private key found: ${JSON.stringify(
          e,
        )}`,
      );
    }

    if (privateKey.length) {
      const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
      transaction.sign(sourceKeys);
      return { signedTransaction: transaction.toXDR() };
    }

    return { error: "Session timed out" };
  };

  const signFreighterSorobanTransaction = async () => {
    const { transactionXDR, network } = request;

    const Sdk = getSdk(network);

    const transaction = Sdk.TransactionBuilder.fromXDR(transactionXDR, network);
    const keyId = (await localStore.getItem(KEY_ID)) || "";
    let privateKey = "";

    try {
      privateKey = await getEncryptedTemporaryData({
        localStore,
        sessionStore,
        keyName: keyId,
      });
    } catch (e) {
      captureException(
        `Sign freighter Soroban transaction: No private key found: ${JSON.stringify(
          e,
        )}`,
      );
    }

    if (privateKey.length) {
      const sourceKeys = Sdk.Keypair.fromSecret(privateKey);
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

  const loadLastUsedAccount = async () => {
    const lastUsedAccount = (await localStore.getItem(LAST_USED_ACCOUNT)) || "";
    return { lastUsedAccount };
  };

  const signOut = async () => {
    sessionStore.dispatch(logOut());
    await localStore.remove(TEMPORARY_STORE_ID);

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
    const { isDataSharingAllowed, isMemoValidationEnabled, isHideDustEnabled } =
      request;

    await localStore.setItem(DATA_SHARING_ID, isDataSharingAllowed);
    await localStore.setItem(IS_VALIDATING_MEMO_ID, isMemoValidationEnabled);
    await localStore.setItem(IS_HIDE_DUST_ENABLED_ID, isHideDustEnabled);

    const networkDetails = await getNetworkDetails();
    const isRpcHealthy = await getIsRpcHealthy(networkDetails);
    const featureFlags = await getFeatureFlags();

    return {
      allowList: await getAllowList(),
      isDataSharingAllowed,
      isMemoValidationEnabled: await getIsMemoValidationEnabled(),
      networkDetails,
      networksList: await getNetworksList(),
      isRpcHealthy,
      isSorobanPublicEnabled: featureFlags.useSorobanPublic,
      isNonSSLEnabled: await getIsNonSSLEnabled(),
      isHideDustEnabled: await getIsHideDustEnabled(),
    };
  };

  const saveExperimentalFeatures = async () => {
    const { isExperimentalModeEnabled, isHashSigningEnabled, isNonSSLEnabled } =
      request;

    await localStore.setItem(IS_HASH_SIGNING_ENABLED_ID, isHashSigningEnabled);
    await localStore.setItem(IS_NON_SSL_ENABLED_ID, isNonSSLEnabled);

    const currentIsExperimentalModeEnabled =
      await getIsExperimentalModeEnabled();

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

    return {
      isExperimentalModeEnabled: await getIsExperimentalModeEnabled(),
      isHashSigningEnabled: await getIsHashSigningEnabled(),
      isNonSSLEnabled: await getIsNonSSLEnabled(),
      networkDetails: await getNetworkDetails(),
      networksList: await getNetworksList(),
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
    const isHashSigningEnabled = await getIsHashSigningEnabled();
    const assetsLists = await getAssetsLists();
    const isNonSSLEnabled = await getIsNonSSLEnabled();
    const isHideDustEnabled = await getIsHideDustEnabled();

    return {
      allowList: await getAllowList(),
      isDataSharingAllowed,
      isMemoValidationEnabled: await getIsMemoValidationEnabled(),
      isExperimentalModeEnabled: await getIsExperimentalModeEnabled(),
      isHashSigningEnabled,
      networkDetails: await getNetworkDetails(),
      networksList: await getNetworksList(),
      isSorobanPublicEnabled: featureFlags.useSorobanPublic,
      isRpcHealthy,
      userNotification,
      assetsLists,
      isNonSSLEnabled,
      isHideDustEnabled,
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

  const getMemoRequiredAccounts = async () => {
    try {
      const resp = await cachedFetch(
        STELLAR_EXPERT_MEMO_REQUIRED_ACCOUNTS_URL,
        CACHED_MEMO_REQUIRED_ACCOUNTS_ID,
      );
      const memoRequiredAccounts: MemoRequiredAccount[] =
        resp?._embedded?.records || [];
      return { memoRequiredAccounts };
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

    const response = await addTokenWithContractId({
      contractId: tokenId,
      network,
      publicKey,
    });

    return response;
  };

  const addTokenWithContractId = async (args: {
    contractId: string;
    network: string;
    publicKey: string;
  }) => {
    const { contractId: tokenId, network, publicKey } = args;

    const tokenIdsByNetwork = (await localStore.getItem(TOKEN_ID_LIST)) || {};
    const tokenIdList = tokenIdsByNetwork[network] || {};
    const keyId = (await localStore.getItem(KEY_ID)) || "";

    const accountTokenIdList = tokenIdList[keyId] || [];

    if (accountTokenIdList.includes(tokenId)) {
      return { error: "Token ID already exists" };
    }

    try {
      await subscribeTokenBalance({ publicKey, contractId: tokenId, network });
      await subscribeTokenHistory({ publicKey, contractId: tokenId, network });

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

    const mnemonicPhrase = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: TEMPORARY_STORE_EXTRA_ID,
    });
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
    const { balancesToMigrate, isMergeSelected, recommendedFee, password } =
      request;

    const migratedMnemonicPhrase = migratedMnemonicPhraseSelector(
      sessionStore.getState(),
    );
    const migratedAccounts = [];

    if (!password || !migratedMnemonicPhrase) {
      return { error: "Authentication error" };
    }

    const newWallet = fromMnemonic(migratedMnemonicPhrase);
    const keyIdList: string = await getKeyIdList();
    const fee = xlmToStroop(recommendedFee).toFixed();

    // we expect all migrations to be done on MAINNET
    const server = stellarSdkServer(
      NETWORK_URLS.PUBLIC,
      MAINNET_NETWORK_DETAILS.networkPassphrase,
    );
    const networkPassphrase = StellarSdk.Networks.PUBLIC;

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

      const store = await _unlockKeystore({ password, keyID });

      const sourceAccount = await server.loadAccount(publicKey);

      // create a new keystore and migrate while replacing the keyId in the list
      const newKeyPair = {
        publicKey: newWallet.getPublicKey(keyIdIndex),
        privateKey: newWallet.getSecret(keyIdIndex),
      };

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
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
        StellarSdk.Operation.createAccount({
          destination: newKeyPair.publicKey,
          startingBalance,
        }),
      );

      const sourceKeys = StellarSdk.Keypair.fromSecret(store.privateKey);
      const builtTransaction = transaction.setTimeout(180).build();

      try {
        builtTransaction.sign(sourceKeys);
      } catch (e) {
        console.error(e);
      }

      try {
        await submitTx({ server, tx: builtTransaction });
      } catch (e) {
        console.error(e);
        migratedAccount.isMigrated = false;
      }

      // if the preceding step has failed, this will fail as well. Don't bother making the API call
      if (migratedAccount.isMigrated) {
        try {
          // now that the destination accounts are funded, we can add the trustline balances

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

        const mergeTransaction = new StellarSdk.TransactionBuilder(
          sourceAccount,
          {
            fee,
            networkPassphrase,
          },
        );
        mergeTransaction.addOperation(
          StellarSdk.Operation.accountMerge({
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
          await submitTx({ server, tx: builtMergeTransaction });
        } catch (e) {
          console.error(e);
          migratedAccount.isMigrated = false;
        }
      }

      if (migratedAccount.isMigrated) {
        // replace the source account with the new one in `allAccounts` and store the keys

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

      await clearSession({ localStore, sessionStore });

      sessionTimer.startSession();
      const hashKey = await deriveKeyFromString(password);
      await storeEncryptedTemporaryData({
        localStore,
        keyName: await localStore.getItem(KEY_ID),
        temporaryData: newWallet.getSecret(0),
        hashKey,
      });
      await storeActiveHashKey({
        sessionStore,
        hashKey,
      });
    }

    const currentState = sessionStore.getState();

    return {
      migratedAccounts,
      publicKey: publicKeySelector(currentState),
      allAccounts: allAccountsSelector(currentState),
      hasPrivateKey: await hasPrivateKeySelector(currentState),
    };
  };

  const addAssetsList = async () => {
    const { assetsList, network } = request;

    const currentAssetsLists = await getAssetsLists();

    if (
      currentAssetsLists[network].some(
        (list: { url: string }) => list.url === assetsList.url,
      )
    ) {
      return {
        error: "Asset list already exists",
      };
    }

    currentAssetsLists[network].push(assetsList);

    await localStore.setItem(ASSETS_LISTS_ID, currentAssetsLists);

    return { assetsLists: await getAssetsLists() };
  };

  const modifyAssetsList = async () => {
    const { assetsList, network, isDeleteAssetsList } = request;

    const currentAssetsLists = await getAssetsLists();
    const networkAssetsLists = currentAssetsLists[network];

    const index = networkAssetsLists.findIndex(
      ({ url }: { url: string }) => url === assetsList.url,
    );

    if (
      index < DEFAULT_ASSETS_LISTS[network as AssetsListKey].length &&
      isDeleteAssetsList
    ) {
      // if a user is somehow able to trigger a delete on a default asset list, return an error
      return { error: "Unable to delete asset list" };
    }

    if (isDeleteAssetsList) {
      networkAssetsLists.splice(index, 1);
    } else {
      networkAssetsLists.splice(index, 1, assetsList);
    }

    await localStore.setItem(ASSETS_LISTS_ID, currentAssetsLists);

    return { assetsLists: await getAssetsLists() };
  };

  const getIsAccountMismatch = () => {
    const { activePublicKey } = request;

    if (!activePublicKey) {
      return { isAccountMismatch: false };
    }

    const currentState = sessionStore.getState();
    const publicKey = publicKeySelector(currentState);

    return { isAccountMismatch: publicKey !== activePublicKey };
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
    [SERVICE_TYPES.CONFIRM_MIGRATED_MNEMONIC_PHRASE]:
      confirmMigratedMnemonicPhrase,
    [SERVICE_TYPES.RECOVER_ACCOUNT]: recoverAccount,
    [SERVICE_TYPES.CONFIRM_PASSWORD]: confirmPassword,
    [SERVICE_TYPES.GRANT_ACCESS]: grantAccess,
    [SERVICE_TYPES.REJECT_ACCESS]: rejectAccess,
    [SERVICE_TYPES.ADD_TOKEN]: addToken,
    [SERVICE_TYPES.SIGN_TRANSACTION]: signTransaction,
    [SERVICE_TYPES.SIGN_BLOB]: signBlob,
    [SERVICE_TYPES.SIGN_AUTH_ENTRY]: signAuthEntry,
    [SERVICE_TYPES.HANDLE_SIGNED_HW_PAYLOAD]: handleSignedHwPayload,
    [SERVICE_TYPES.REJECT_TRANSACTION]: rejectTransaction,
    [SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION]: signFreighterTransaction,
    [SERVICE_TYPES.SIGN_FREIGHTER_SOROBAN_TRANSACTION]:
      signFreighterSorobanTransaction,
    [SERVICE_TYPES.ADD_RECENT_ADDRESS]: addRecentAddress,
    [SERVICE_TYPES.LOAD_RECENT_ADDRESSES]: loadRecentAddresses,
    [SERVICE_TYPES.LOAD_LAST_USED_ACCOUNT]: loadLastUsedAccount,
    [SERVICE_TYPES.SIGN_OUT]: signOut,
    [SERVICE_TYPES.SHOW_BACKUP_PHRASE]: showBackupPhrase,
    [SERVICE_TYPES.SAVE_ALLOWLIST]: saveAllowList,
    [SERVICE_TYPES.SAVE_SETTINGS]: saveSettings,
    [SERVICE_TYPES.SAVE_EXPERIMENTAL_FEATURES]: saveExperimentalFeatures,
    [SERVICE_TYPES.LOAD_SETTINGS]: loadSettings,
    [SERVICE_TYPES.GET_CACHED_ASSET_ICON]: getCachedAssetIcon,
    [SERVICE_TYPES.CACHE_ASSET_ICON]: cacheAssetIcon,
    [SERVICE_TYPES.GET_CACHED_ASSET_DOMAIN]: getCachedAssetDomain,
    [SERVICE_TYPES.CACHE_ASSET_DOMAIN]: cacheAssetDomain,
    [SERVICE_TYPES.RESET_EXP_DATA]: resetExperimentalData,
    [SERVICE_TYPES.ADD_TOKEN_ID]: addTokenId,
    [SERVICE_TYPES.GET_TOKEN_IDS]: getTokenIds,
    [SERVICE_TYPES.REMOVE_TOKEN_ID]: removeTokenId,
    [SERVICE_TYPES.GET_MEMO_REQUIRED_ACCOUNTS]: getMemoRequiredAccounts,
    [SERVICE_TYPES.GET_MIGRATABLE_ACCOUNTS]: getMigratableAccounts,
    [SERVICE_TYPES.GET_MIGRATED_MNEMONIC_PHRASE]: getMigratedMnemonicPhrase,
    [SERVICE_TYPES.MIGRATE_ACCOUNTS]: migrateAccounts,
    [SERVICE_TYPES.ADD_ASSETS_LIST]: addAssetsList,
    [SERVICE_TYPES.MODIFY_ASSETS_LIST]: modifyAssetsList,
    [SERVICE_TYPES.GET_IS_ACCOUNT_MISMATCH]: getIsAccountMismatch,
  };

  const currentState = sessionStore.getState();
  const publicKey = publicKeySelector(currentState);

  if (
    request.activePublicKey &&
    request.activePublicKey !== publicKey &&
    request.type !== SERVICE_TYPES.GET_IS_ACCOUNT_MISMATCH
  ) {
    return { error: "Public key does not match active public key" };
  }
  return messageResponder[request.type]();
};
