import {
  DEFAULT_NETWORKS,
  FUTURENET_NETWORK_DETAILS,
  NETWORKS,
  TESTNET_NETWORK_DETAILS,
  SOROBAN_RPC_URLS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  ASSETS_LISTS_ID,
  HAS_ACCOUNT_SUBSCRIPTION,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  STORAGE_VERSION,
  TOKEN_ID_LIST,
} from "constants/localStorageTypes";
import * as DataStorage from "../dataStorage";
import * as DataStorageAccess from "../dataStorageAccess";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";

class MockStorage {
  storage: Record<string, any>;
  constructor() {
    this.storage = {};
  }
  get = async (key: string) => {
    return this.storage[key] || {};
  };
  set = async (params: { [key: string]: any }) => {
    for (const key of Object.keys(params)) {
      this.storage[key] = {
        [key]: params[key],
      };
    }
  };
  clear = async () => {
    this.storage = {};
  };
}

const dataStorageAccess = (storageApi: DataStorageAccess.StorageOption) => {
  const store = DataStorageAccess.dataStorage(storageApi);
  return {
    getItem: store.getItem,
    setItem: async (keyId: string, value: any) => {
      await store.setItem({ [keyId]: value });
    },
    clear: () => store.clear(),
    remove: (keys: string | string[]) => store.remove(keys),
  };
};

const mockStorage = new MockStorage();

jest
  .spyOn(DataStorageAccess, "dataStorageAccess")
  .mockImplementation(() =>
    dataStorageAccess(mockStorage as Storage["StorageArea"])
  );

describe("Storage migrations", () => {
  afterEach(async () => {
    await mockStorage.clear();
  });

  it("migrateFriendBotUrlNetworkDetails should set friendbot URLs from constants", async () => {
    await DataStorage.migrateFriendBotUrlNetworkDetails();
    const stored = await mockStorage.get(NETWORKS_LIST_ID);
    const testnetDetails = stored[NETWORKS_LIST_ID].find(
      (list: { network: NETWORKS }) => list.network === NETWORKS.TESTNET
    );
    expect(testnetDetails.friendbotUrl).toEqual(
      TESTNET_NETWORK_DETAILS.friendbotUrl
    );
  });
  it("migrateSorobanRpcUrlNetworkDetails", async () => {
    const networkDetailsList = [...DEFAULT_NETWORKS, FUTURENET_NETWORK_DETAILS];
    await mockStorage.set({ [NETWORKS_LIST_ID]: networkDetailsList });
    await DataStorage.migrateSorobanRpcUrlNetworkDetails();
    const stored = await mockStorage.get(NETWORKS_LIST_ID);
    const futurenetDetails = stored[NETWORKS_LIST_ID].find(
      (list: { network: NETWORKS }) => list.network === NETWORKS.FUTURENET
    );
    expect(futurenetDetails.sorobanRpcUrl).toEqual(
      SOROBAN_RPC_URLS[NETWORKS.FUTURENET]
    );
  });
  it("migrateTokenIdList should migrate top level TOKEN_IDS(initially futurenet) to being keyed by networks", async () => {
    const tokenIdList = ["id1", "id2"];
    await mockStorage.set({ [TOKEN_ID_LIST]: tokenIdList });
    await DataStorage.migrateTokenIdList();
    const stored = await mockStorage.get(TOKEN_ID_LIST);
    expect(stored[TOKEN_ID_LIST]).toEqual({
      [NETWORKS.FUTURENET]: tokenIdList,
    });
  });
  it("migrateTokenIdList should set new storage version if unset", async () => {
    const tokenIdList = ["id1", "id2"];
    await mockStorage.set({ [TOKEN_ID_LIST]: tokenIdList });
    await DataStorage.migrateTokenIdList();
    const stored = await mockStorage.get(STORAGE_VERSION);
    expect(stored[STORAGE_VERSION]).toEqual("1.0.0");
  });
  it("migrateTokenIdList should set new storage version if version < 1.0", async () => {
    const tokenIdList = ["id1", "id2"];
    await mockStorage.set({ [STORAGE_VERSION]: "0.0.9" });
    await mockStorage.set({ [TOKEN_ID_LIST]: tokenIdList });
    await DataStorage.migrateTokenIdList();
    const stored = await mockStorage.get(STORAGE_VERSION);
    expect(stored[STORAGE_VERSION]).toEqual("1.0.0");
  });
  it("migrateTokenIdList should not change storage if version > 1.0", async () => {
    const tokenIdList = ["id1", "id2"];
    await mockStorage.set({ [STORAGE_VERSION]: "1.0.1" });
    await mockStorage.set({ [TOKEN_ID_LIST]: tokenIdList });
    await DataStorage.migrateTokenIdList();
    const stored = await mockStorage.get(STORAGE_VERSION);
    expect(stored[STORAGE_VERSION]).toEqual("1.0.1");
    expect(stored[TOKEN_ID_LIST]).toBeUndefined;
  });
  it("migrateTestnetSorobanRpcUrlNetworkDetails should add soroban rpc URL for testnet in newtorks list", async () => {
    await DataStorage.migrateTestnetSorobanRpcUrlNetworkDetails();
    const stored = await mockStorage.get(NETWORKS_LIST_ID);
    const testnetDetails = stored[NETWORKS_LIST_ID].find(
      (list: { network: NETWORKS }) => list.network === NETWORKS.TESTNET
    );
    expect(testnetDetails.sorobanRpcUrl).toEqual(
      TESTNET_NETWORK_DETAILS.sorobanRpcUrl
    );
  });
  it("migrateTestnetSorobanRpcUrlNetworkDetails should add soroban rpc URL for testnet in current network if it is testnet", async () => {
    await mockStorage.set({ [NETWORK_ID]: TESTNET_NETWORK_DETAILS });
    await DataStorage.migrateTestnetSorobanRpcUrlNetworkDetails();
    const stored = await mockStorage.get(NETWORK_ID);
    expect(stored[NETWORK_ID].sorobanRpcUrl).toEqual(
      TESTNET_NETWORK_DETAILS.sorobanRpcUrl
    );
  });
  it("migrateTestnetSorobanRpcUrlNetworkDetails should set version to 2.0", async () => {
    await DataStorage.migrateTestnetSorobanRpcUrlNetworkDetails();
    const stored = await mockStorage.get(STORAGE_VERSION);
    expect(stored[STORAGE_VERSION]).toEqual("2.0.0");
  });
  it("migrateTestnetSorobanRpcUrlNetworkDetails should not change storage if version is > 2.0", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "2.0.1" });
    await DataStorage.migrateTestnetSorobanRpcUrlNetworkDetails();
    const storedVersion = await mockStorage.get(STORAGE_VERSION);
    const storedNetworks = await mockStorage.get(NETWORKS_LIST_ID);
    expect(storedVersion[STORAGE_VERSION]).toEqual("2.0.1");
    expect(storedNetworks[NETWORKS_LIST_ID]).toBeUndefined;
  });
  it("migrateToAccountSubscriptions should set an empty map for account subscriptions", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "3.0.0" });
    await DataStorage.migrateToAccountSubscriptions();
    const storedAccountSubs = await mockStorage.get(HAS_ACCOUNT_SUBSCRIPTION);
    expect(storedAccountSubs[HAS_ACCOUNT_SUBSCRIPTION]).toEqual({});
  });
  it("migrateToAccountSubscriptions should set an empty map for account subscriptions on storage version 3.0", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "3.0.1" });
    await DataStorage.migrateToAccountSubscriptions();
    const storedAccountSubs = await mockStorage.get(HAS_ACCOUNT_SUBSCRIPTION);
    expect(storedAccountSubs[HAS_ACCOUNT_SUBSCRIPTION]).toBeUndefined();
  });
  it("migrateMainnetSorobanRpcUrlNetworkDetails should set the pubnet rpc URL to the value from our constants at storage version <= 4.0", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "3.0.1" });
    await mockStorage.set({ [NETWORK_ID]: MAINNET_NETWORK_DETAILS });
    await DataStorage.migrateMainnetSorobanRpcUrlNetworkDetails();
    const storedVersion = await mockStorage.get(STORAGE_VERSION);
    const storedCurrentNetwork = await mockStorage.get(NETWORK_ID);
    const storedNetworks = await mockStorage.get(NETWORKS_LIST_ID);
    const pubNetDetails = storedNetworks[NETWORKS_LIST_ID].find(
      (list: { network: NETWORKS }) => list.network === NETWORKS.PUBLIC
    );
    expect(pubNetDetails.sorobanRpcUrl).toEqual(
      MAINNET_NETWORK_DETAILS.sorobanRpcUrl
    );
    expect(storedVersion[STORAGE_VERSION]).toEqual("4.0.0");
    expect(storedCurrentNetwork[NETWORK_ID].sorobanRpcUrl).toEqual(
      MAINNET_NETWORK_DETAILS.sorobanRpcUrl
    );
  });
  it("migrateMainnetSorobanRpcUrlNetworkDetails should not update networks list if version is > 4.0.0", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "4.0.1" });
    const previousPubnetDetails = {
      ...MAINNET_NETWORK_DETAILS,
      sorobanRpcUrl: undefined,
    };
    await mockStorage.set({ [NETWORKS_LIST_ID]: [previousPubnetDetails] });
    await DataStorage.migrateMainnetSorobanRpcUrlNetworkDetails();
    const storedNetworks = await mockStorage.get(NETWORKS_LIST_ID);
    const pubNetDetails = storedNetworks[NETWORKS_LIST_ID].find(
      (list: { network: NETWORKS }) => list.network === NETWORKS.PUBLIC
    );
    expect(pubNetDetails.sorobanRpcUrl).toBeUndefined();
  });
  it("migrateSorobanRpcUrlNetwork should set a futurenet RPC if version is <= 4.0.1 and the currently selected network is futurenet and it has no rpc URL", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "4.0.0" });
    const previousFuturenetDetails = {
      ...FUTURENET_NETWORK_DETAILS,
      sorobanRpcUrl: undefined,
    };
    await mockStorage.set({ [NETWORK_ID]: previousFuturenetDetails });
    await DataStorage.migrateSorobanRpcUrlNetwork();
    const storedCurrentNetwork = await mockStorage.get(NETWORK_ID);
    const storedVersion = await mockStorage.get(STORAGE_VERSION);
    expect(storedCurrentNetwork[NETWORK_ID].sorobanRpcUrl).toEqual(
      FUTURENET_NETWORK_DETAILS.sorobanRpcUrl
    );
    expect(storedVersion[STORAGE_VERSION]).toEqual("4.0.1");
  });
  it("resetAccountSubscriptions should reset accoutn subscriptions at storage versions 4.0.2", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "4.0.2" });
    await DataStorage.resetAccountSubscriptions();
    const storedAccountSubs = await mockStorage.get(HAS_ACCOUNT_SUBSCRIPTION);
    expect(storedAccountSubs[HAS_ACCOUNT_SUBSCRIPTION]).toEqual({});
  });
  it("addAssetsLists should add the default asset list to storage at versions <= 4.1.0", async () => {
    await mockStorage.set({ [STORAGE_VERSION]: "4.0.2" });
    await DataStorage.addAssetsLists();
    const storedAssetList = await mockStorage.get(ASSETS_LISTS_ID);
    const storedVersion = await mockStorage.get(STORAGE_VERSION);
    expect(storedAssetList[ASSETS_LISTS_ID]).toEqual(DEFAULT_ASSETS_LISTS);
    expect(storedVersion[STORAGE_VERSION]).toEqual("4.1.0");
  });
});
