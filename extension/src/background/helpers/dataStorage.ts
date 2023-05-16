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
export const localStorage = storage?.local;
export const sessionStorage = storage?.session;

// Session Storage Feature Flag - turn on when storage.session is supported
export const SESSION_STORAGE_ENABLED = false;

export type StorageOption = typeof localStorage | typeof sessionStorage;

export const dataStorage = (storageApi: StorageOption = localStorage) => ({
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

export const dataStorageAccess = (storageApi: StorageOption = localStorage) => {
  const store = dataStorage(storageApi);
  return {
    getItem: store.getItem,
    setItem: async (keyId: string, value: any) => {
      await store.setItem({ [keyId]: value });
    },
    clear: () => store.clear(),
  };
};

// This migration adds a friendbotUrl to testnet and futurenet network details
export const migrateFriendBotUrlNetworkDetails = async () => {
  const localStore = dataStorageAccess(localStorage);

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
