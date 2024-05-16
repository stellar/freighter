import { dataStorage } from "../dataStorage";

class MockStorage {
  storage: Record<string, any>;
  constructor() {
    this.storage = {};
  }
  get = async (key: string) => {
    return this.storage[key];
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

const mockStorage = new MockStorage();

afterEach(async () => {
  await mockStorage.clear();
});

describe("Data Storage", () => {
  it("should allow getting/setting an item by key", async () => {
    const key = "key1";
    const value = "value1";
    const storage = dataStorage(mockStorage as Storage["StorageArea"]);
    await storage.setItem({ [key]: value });
    const item = await storage.getItem(key);
    expect(item).toEqual(value);
  });
});
