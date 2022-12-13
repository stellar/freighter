import browser from "webextension-polyfill";

interface SetItemParams {
  [key: string]: any;
}

export const browserStorage = browser.storage?.local;

export const dataStorage = {
  getItem: async (key: string) => {
    // TODO: re-enable defaults by passing an object. The value of the key-value pair will be the default

    const storageResult = await browser.storage.local.get(key);
    let val = storageResult[key];
    if (val && typeof val !== "string") {
      val = JSON.stringify(storageResult[key]);
    }

    return val;
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
  setItem: async (keyId: string, value: string) => {
    await dataStorage.setItem({ [keyId]: value });
  },
  clear: () => dataStorage.clear(),
};
