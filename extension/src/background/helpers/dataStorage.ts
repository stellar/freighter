import browser from "webextension-polyfill";

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
export const browserStorage = storage?.local;
export const sessionStorage = storage?.session;

export const SESSION_STORAGE_ENABLED = false;

export type StorageOption = typeof browserStorage | typeof sessionStorage;

export const dataStorage = (storageApi: StorageOption = browserStorage) => ({
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
  storageApi: StorageOption = browserStorage,
) => {
  const _storage = dataStorage(storageApi);
  return {
    getItem: (keyId: string) => _storage.getItem(keyId),
    setItem: async (keyId: string, value: any) => {
      await _storage.setItem({ [keyId]: value });
    },
    clear: () => _storage.clear(),
  };
};
