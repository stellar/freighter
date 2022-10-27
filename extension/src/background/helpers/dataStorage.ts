import { browser } from "webextension-polyfill-ts";

interface GetItemParams {
  key: string;
  defaultValue?: string;
}

interface SetItemParams {
  [key: string]: any;
}

export const dataStorage = {
  getItem: async ({ key, defaultValue }: GetItemParams) => {
    const storage = await browser.storage.local.get(key);

    return storage[key] ?? defaultValue;
  },
  setItem: async (setItemParams: SetItemParams) => {
    await browser.storage.local.set(setItemParams);
  },
};
