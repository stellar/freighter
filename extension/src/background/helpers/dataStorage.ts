import browser from "webextension-polyfill";

import { NETWORKS_LIST_ID } from "constants/localStorageTypes";
import {
  DEFAULT_NETWORKS,
  NetworkDetails,
  NETWORKS,
  TESTNET_NETWORK_DETAILS,
  FUTURENET_NETWORK_DETAILS,
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
