import browser from "webextension-polyfill";

export interface SetItemParams {
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
  remove: async (keys: string | string[]) => {
    await storageApi.remove(keys);
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
    remove: store.remove,
  };
};
