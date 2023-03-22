import { browser } from "webextension-polyfill-ts";
import { KEY_ID } from "constants/localStorageTypes";

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

  /* 
    The above migration mistakenly sets keyId as a number, which causes issues downstream:
    - we need to be able to use String.indexOf to determine if the keyId belongs to a hardware wallet
    - @stellar/walet-sdk expects a string when dealing unlocking a keystore by keyId
    - in other places in code where we save keyId, we do so as a string

    Let's solve the issue at its source
  */
  const keyId = (await dataStorageAccess.getItem(KEY_ID)) as string | number;
  if (typeof keyId === "number") {
    await dataStorageAccess.setItem(KEY_ID, keyId.toString());
  }
};

// TODO - temporary wrapper around localStorage until we replace
// localStorage all together
export const dataStorageAccess = {
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
