import browser from "webextension-polyfill";
import semver from "semver";

import {
  HAS_ACCOUNT_SUBSCRIPTION,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  STORAGE_VERSION,
  TOKEN_ID_LIST,
} from "constants/localStorageTypes";
import {
  DEFAULT_NETWORKS,
  NetworkDetails,
  NETWORKS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
  FUTURENET_NETWORK_DETAILS,
  SOROBAN_RPC_URLS,
} from "@shared/constants/stellar";

interface SetItemParams {
  [key: string]: any;
}

// https://github.com/mozilla/webextension-polyfill/issues/424
interface BrowserStorage extends browser.Storage.Static {
  session: browser.Storage.LocalStorageArea;
}

const storage = browser.storage as BrowserStorage;

// browser storage uses local storage which stores values on disk and persists data across sessions
// session storage uses session storage which stores data in memory and clears data after every "session"
// only use session storage for secrets or sensitive values
export const browserLocalStorage = storage?.local;
export const browserSessionStorage = storage?.session;

// Session Storage Feature Flag - turn on when storage.session is supported
export const SESSION_STORAGE_ENABLED = false;

export type StorageOption =
  | typeof browserLocalStorage
  | typeof browserSessionStorage;

export const dataStorage = (
  storageApi: StorageOption = browserLocalStorage,
) => ({
  getItem: async (key: string) => {
    // TODO: re-enable defaults by passing an object. The value of the key-value pair will be the default

    const storageResult = await storageApi.get(key);

    return storageResult[key];
  },
  setItem: async (setItemParams: SetItemParams) => {
    await storageApi.set(setItemParams);
  },

  clear: async () => {
    await storageApi.clear();
  },
});

export const dataStorageAccess = (
  storageApi: StorageOption = browserLocalStorage,
) => {
  const store = dataStorage(storageApi);
  return {
    getItem: store.getItem,
    setItem: async (keyId: string, value: any) => {
      await store.setItem({ [keyId]: value });
    },
    clear: () => store.clear(),
  };
};

export const normalizeMigratedData = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const localStorageEntries = Object.entries(localStorage);

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < localStorageEntries.length; i++) {
    const [key, value] = localStorageEntries[i];
    try {
      if (typeof value === "string") {
        const parsedValue = JSON.parse(value);
        // eslint-disable-next-line no-await-in-loop
        await localStore.setItem(key, parsedValue);
      }
    } catch (e) {
      // do not transform v
    }
  }
};

// This migration adds a friendbotUrl to testnet and futurenet network details
export const migrateFriendBotUrlNetworkDetails = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);

  const networksList: NetworkDetails[] =
    (await localStore.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

  const migratedNetworkList = networksList.map((network) => {
    if (network.network === NETWORKS.TESTNET) {
      return TESTNET_NETWORK_DETAILS;
    }

    if (network.network === FUTURENET_NETWORK_DETAILS.network) {
      return FUTURENET_NETWORK_DETAILS;
    }

    return network;
  });

  await localStore.setItem(NETWORKS_LIST_ID, migratedNetworkList);
};

export const migrateSorobanRpcUrlNetworkDetails = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);

  const networksList: NetworkDetails[] =
    (await localStore.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

  const migratedNetworkList = networksList.map((network) => {
    if (network.network === NETWORKS.FUTURENET) {
      return {
        ...FUTURENET_NETWORK_DETAILS,
        sorobanRpcUrl: SOROBAN_RPC_URLS[NETWORKS.FUTURENET],
      };
    }

    return network;
  });

  await localStore.setItem(NETWORKS_LIST_ID, migratedNetworkList);
};

// This migration migrates the storage for custom tokens IDs to be keyed by network
const migrateTokenIdList = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const tokenIdsByKey = (await localStore.getItem(TOKEN_ID_LIST)) as Record<
    string,
    object
  >;
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "1.0.0")) {
    const newTokenList = {
      [NETWORKS.FUTURENET]: tokenIdsByKey,
    };
    await localStore.setItem(TOKEN_ID_LIST, newTokenList);
  }
  await migrateDataStorageVersion("1.0.0");
};

const migrateTestnetSorobanRpcUrlNetworkDetails = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "2.0.0")) {
    const networksList: NetworkDetails[] =
      (await localStore.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

    const migratedNetworkList = networksList.map((network) => {
      if (network.network === NETWORKS.TESTNET) {
        return {
          ...TESTNET_NETWORK_DETAILS,
          sorobanRpcUrl: SOROBAN_RPC_URLS[NETWORKS.TESTNET],
        };
      }

      return network;
    });

    const currentNetwork = await localStore.getItem(NETWORK_ID);

    if (currentNetwork && currentNetwork.network === NETWORKS.TESTNET) {
      await localStore.setItem(NETWORK_ID, TESTNET_NETWORK_DETAILS);
    }

    await localStore.setItem(NETWORKS_LIST_ID, migratedNetworkList);
    await migrateDataStorageVersion("2.0.0");
  }
};

export const migrateToAccountSubscriptions = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  // we only want to run this once per user
  if (!storageVersion || semver.eq(storageVersion, "3.0.0")) {
    // once account is unlocked, setup Mercury account subscription if !HAS_ACCOUNT_SUBSCRIPTION
    await localStore.setItem(HAS_ACCOUNT_SUBSCRIPTION, {});
  }
};

const migrateMainnetSorobanRpcUrlNetworkDetails = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "4.0.0")) {
    const networksList: NetworkDetails[] =
      (await localStore.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

    const migratedNetworkList = networksList.map((network) => {
      if (network.network === NETWORKS.PUBLIC) {
        return {
          ...MAINNET_NETWORK_DETAILS,
          sorobanRpcUrl: SOROBAN_RPC_URLS[NETWORKS.PUBLIC],
        };
      }

      return network;
    });

    const currentNetwork = await localStore.getItem(NETWORK_ID);

    if (currentNetwork && currentNetwork.network === NETWORKS.PUBLIC) {
      await localStore.setItem(NETWORK_ID, MAINNET_NETWORK_DETAILS);
    }

    await localStore.setItem(NETWORKS_LIST_ID, migratedNetworkList);
    await migrateDataStorageVersion("4.0.0");
  }
};

export const versionedMigration = async () => {
  // sequentially call migrations in order to enforce smooth schema upgrades

  await migrateTokenIdList();
  await migrateTestnetSorobanRpcUrlNetworkDetails();
  await migrateToAccountSubscriptions();
  await migrateMainnetSorobanRpcUrlNetworkDetails();
};

// Updates storage version
export const migrateDataStorageVersion = async (version: string) => {
  const localStore = dataStorageAccess(browserLocalStorage);

  // This value should be manually updated when a new schema change is made
  await localStore.setItem(STORAGE_VERSION, version);
};
