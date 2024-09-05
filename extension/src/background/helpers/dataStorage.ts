import semver from "semver";

import {
  APPLICATION_ID,
  HAS_ACCOUNT_SUBSCRIPTION,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  STORAGE_VERSION,
  TOKEN_ID_LIST,
  ASSETS_LISTS_ID,
  IS_HASH_SIGNING_ENABLED_ID,
  IS_NON_SSL_ENABLED_ID,
  IS_BLOCKAID_ANNOUNCED_ID,
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
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/token";
import { dataStorageAccess, browserLocalStorage } from "./dataStorageAccess";

// Session Storage Feature Flag - turn on when storage.session is supported
export const SESSION_STORAGE_ENABLED = true;

export const normalizeMigratedData = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const localStorageEntries = Object.entries(
    await browserLocalStorage.get(null),
  );

  const applicationState = await localStore.getItem(APPLICATION_ID);
  const isLocalStoreSetup = !!applicationState?.length;

  if (isLocalStoreSetup) {
    return;
  }

  // eslint-disable-next-line
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
export const migrateTokenIdList = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const tokenIdsByKey = await localStore.getItem(TOKEN_ID_LIST);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "1.0.0")) {
    if (Array.isArray(tokenIdsByKey)) {
      const newTokenList = {
        [NETWORKS.FUTURENET]: tokenIdsByKey,
      };
      await localStore.setItem(TOKEN_ID_LIST, newTokenList);
    }

    await migrateDataStorageVersion("1.0.0");
  }
};

export const migrateTestnetSorobanRpcUrlNetworkDetails = async () => {
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

export const migrateMainnetSorobanRpcUrlNetworkDetails = async () => {
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

export const migrateSorobanRpcUrlNetwork = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "4.0.1")) {
    // an edge case exists in `migrateSorobanRpcUrlNetworkDetails` where we may have updated the `networksList` in storage,
    // but not the `network`, which is the current active network,
    // If a user has Futurenet selected by default, they will not have sorobanRpcUrl set

    const migratedNetwork: NetworkDetails = await localStore.getItem(
      NETWORK_ID,
    );
    if (
      migratedNetwork &&
      migratedNetwork.network === NETWORKS.FUTURENET &&
      !migratedNetwork.sorobanRpcUrl
    ) {
      await localStore.setItem(NETWORK_ID, FUTURENET_NETWORK_DETAILS);
    }
    await migrateDataStorageVersion("4.0.1");
  }
};

export const resetAccountSubscriptions = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.eq(storageVersion, "4.0.2")) {
    // once account is unlocked, setup Mercury account subscription if !HAS_ACCOUNT_SUBSCRIPTION
    await localStore.setItem(HAS_ACCOUNT_SUBSCRIPTION, {});
    await migrateDataStorageVersion("4.0.2");
  }
};

export const addAssetsLists = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "4.1.0")) {
    // add the base asset lists
    await localStore.setItem(ASSETS_LISTS_ID, DEFAULT_ASSETS_LISTS);
    await migrateDataStorageVersion("4.1.0");
  }
};

export const addIsHashSigningEnabled = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "4.1.1")) {
    // add the base asset lists
    await localStore.setItem(IS_HASH_SIGNING_ENABLED_ID, false);
    await migrateDataStorageVersion("4.1.1");
  }
};

export const addIsNonSSLEnabled = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "4.2.0")) {
    await localStore.setItem(IS_NON_SSL_ENABLED_ID, false);
    await migrateDataStorageVersion("4.2.0");
  }
};

export const addIsBlockaidAnnounced = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const storageVersion = (await localStore.getItem(STORAGE_VERSION)) as string;

  if (!storageVersion || semver.lt(storageVersion, "4.3.0")) {
    await localStore.setItem(IS_BLOCKAID_ANNOUNCED_ID, false);
    await migrateDataStorageVersion("4.3.0");
  }
};

export const versionedMigration = async () => {
  // sequentially call migrations in order to enforce smooth schema upgrades

  await migrateTokenIdList();
  await migrateTestnetSorobanRpcUrlNetworkDetails();
  await migrateToAccountSubscriptions();
  await migrateMainnetSorobanRpcUrlNetworkDetails();
  await migrateSorobanRpcUrlNetwork();
  await resetAccountSubscriptions();
  await addAssetsLists();
  await addIsHashSigningEnabled();
  await addIsNonSSLEnabled();
  await addIsBlockaidAnnounced();
};

// Updates storage version
export const migrateDataStorageVersion = async (version: string) => {
  const localStore = dataStorageAccess(browserLocalStorage);

  // This value should be manually updated when a new schema change is made
  await localStore.setItem(STORAGE_VERSION, version);
};
