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

export const browserStorage = browser.storage?.local;

export const dataStorage = {
  getItem: async (key: string) => {
    // TODO: re-enable defaults by passing an object. The value of the key-value pair will be the default

    const storageResult = await browser.storage.local.get(key);

    return storageResult[key];
  },
  setItem: async (setItemParams: SetItemParams) => {
    await browser.storage.local.set(setItemParams);
  },

  clear: async () => {
    await browser.storage.local.clear();
  },
};

export const dataStorageAccess = {
  getItem: (keyId: string) => dataStorage.getItem(keyId),
  setItem: async (keyId: string, value: any) => {
    await dataStorage.setItem({ [keyId]: value });
  },
  clear: () => dataStorage.clear(),
};

// This migration adds a friendbotUrl to testnet and futurenet network details
export const migrateFriendBotUrlNetworkDetails = async () => {
  const networkList = await dataStorageAccess.getItem(NETWORKS_LIST_ID);
  const networksList: NetworkDetails[] = networkList
    ? JSON.parse(networkList)
    : DEFAULT_NETWORKS;

  const migratedNetworkList = networksList.map((network) => {
    if (network.network === NETWORKS.TESTNET) {
      return TESTNET_NETWORK_DETAILS;
    }

    if (network.network === FUTURENET_NETWORK_DETAILS.network) {
      return FUTURENET_NETWORK_DETAILS;
    }

    return network;
  });

  await dataStorageAccess.setItem(
    NETWORKS_LIST_ID,
    JSON.stringify(migratedNetworkList),
  );
};
