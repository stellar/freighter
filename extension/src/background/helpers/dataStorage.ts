import { browser } from "webextension-polyfill-ts";

interface SetItemParams {
  [key: string]: any;
}

export const dataStorage = {
  getItem: async (key: null | string | string[] | { [s: string]: any }) => {
    // Passing an object (for ex: {myKey: "aValue"}) will return the key's (myKey) value from storage.
    // If the key is not found in storage, it will return the the value passed along in object as a default (in this case, "aValue")

    const storageResult = await browser.storage.local.get(key);

    return storageResult;
  },
  setItem: async (setItemParams: SetItemParams) => {
    await browser.storage.local.set(setItemParams);
  },
};

export const migrateLocalStorageToBrowserStorage = async () => {
  const storage: { [key: string]: any } = {};
  Object.entries(localStorage).forEach(([k, v]) => {
    let value = v;
    try {
      const parsedValue = JSON.parse(v);
      value = parsedValue;
    } catch (e) {
      // do not transform v
    }

    storage[k] = value;
  });

  await dataStorage.setItem(storage);
};

// TODO - temporary wrapper around localStorage until we replace
// localStorage all together
export const freighterLocalStorage = {
  getItem: async (keyId: string) => {
    await dataStorage.getItem({ [keyId]: "" });
    return localStorage.getItem(keyId);
  },
  setItem: async (keyId: string, value: string) => {
    await dataStorage.setItem({ [keyId]: value });
    localStorage.setItem(keyId, value);
  },
  clear: () => localStorage.clear(),
};
