import {
  DEFAULT_NETWORKS,
  FUTURENET_NETWORK_DETAILS,
  NETWORKS,
  TESTNET_NETWORK_DETAILS,
  SOROBAN_RPC_URLS,
} from "@shared/constants/stellar";
import {
  NETWORK_ID,
  NETWORKS_LIST_ID,
  STORAGE_VERSION,
  TOKEN_ID_LIST,
} from "constants/localStorageTypes";
import * as DataStorage from "../dataStorage";

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

const dataStorageAccess = (storageApi: DataStorage.StorageOption) => {
  const store = DataStorage.dataStorage(storageApi);
  return {
    getItem: store.getItem,
    setItem: async (keyId: string, value: any) => {
      await store.setItem({ [keyId]: value });
    },
    clear: () => store.clear(),
  };
};

const mockStorage = new MockStorage();

jest
  .spyOn(DataStorage, "dataStorageAccess")
  .mockImplementation(() =>
    dataStorageAccess(mockStorage as Storage["StorageArea"]),
  );

describe("Storage migrations", () => {
  afterEach(async () => {
    await mockStorage.clear();
  });

  it("migrateFriendBotUrlNetworkDetails should set friendbot URLs from constants", async () => {
    await DataStorage.migrateFriendBotUrlNetworkDetails();
    const stored = await mockStorage.get(NETWORKS_LIST_ID);
    const testnetDetails = stored[NETWORKS_LIST_ID].find(
      (list: { network: NETWORKS }) => list.network === NETWORKS.TESTNET,
    );
    expect(testnetDetails.friendbotUrl).toEqual(
      TESTNET_NETWORK_DETAILS.friendbotUrl,
    );
  });
  it("migrateSorobanRpcUrlNetworkDetails", async () => {
    const networkDetailsList = [...DEFAULT_NETWORKS, FUTURENET_NETWORK_DETAILS];
    await mockStorage.set({ [NETWORKS_LIST_ID]: networkDetailsList });
    await DataStorage.migrateSorobanRpcUrlNetworkDetails();
    const stored = await mockStorage.get(NETWORKS_LIST_ID);
    const futurenetDetails = stored[NETWORKS_LIST_ID].find(
      (list: { network: NETWORKS }) => list.network === NETWORKS.FUTURENET,
    );
    expect(futurenetDetails.sorobanRpcUrl).toEqual(
      SOROBAN_RPC_URLS[NETWORKS.FUTURENET],
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
      (list: { network: NETWORKS }) => list.network === NETWORKS.TESTNET,
    );
    expect(testnetDetails.sorobanRpcUrl).toEqual(
      TESTNET_NETWORK_DETAILS.sorobanRpcUrl,
    );
  });
  it("migrateTestnetSorobanRpcUrlNetworkDetails should add soroban rpc URL for testnet in current network if it is testnet", async () => {
    await mockStorage.set({ [NETWORK_ID]: TESTNET_NETWORK_DETAILS });
    await DataStorage.migrateTestnetSorobanRpcUrlNetworkDetails();
    const stored = await mockStorage.get(NETWORK_ID);
    expect(stored[NETWORK_ID].sorobanRpcUrl).toEqual(
      TESTNET_NETWORK_DETAILS.sorobanRpcUrl,
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
});
