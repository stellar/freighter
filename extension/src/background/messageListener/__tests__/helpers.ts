import {
  BrowserStorageKeyStore,
  KeyManager,
  ScryptEncrypter,
} from "@stellar/typescript-wallet-sdk-km";
import { BrowserStorageConfigParams } from "@stellar/typescript-wallet-sdk-km/lib/Plugins/BrowserStorageFacade";
import { sessionSlice } from "background/ducks/session";
import { dataStorageAccess } from "background/helpers/dataStorageAccess";
import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";

const store: Record<string, unknown> = {};
const mockStorageApi = {
  get: jest.fn(async (keys) => {
    const result: Record<string, unknown> = {};

    if (keys === null || keys === undefined) {
      return { ...store };
    }

    if (typeof keys === "string") {
      if (keys in store) {
        result[keys] = store[keys];
      }
    } else if (Array.isArray(keys)) {
      for (const key of keys) {
        if (key in store) {
          result[key] = store[key];
        }
      }
    } else if (typeof keys === "object") {
      for (const key in keys) {
        if (key in store) {
          result[key] = store[key];
        } else {
          result[key] = keys[key];
        }
      }
    }

    return result;
  }),

  set: jest.fn(async (items) => {
    console.log("SET", items);
    Object.assign(store, items);
  }),

  remove: jest.fn(async (keys) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
      delete store[key];
    }
  }),

  clear: jest.fn(async () => {
    for (const key in store) {
      delete store[key];
    }
  }),

  // Just enough to satisfy the type
  onChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListener: jest.fn().mockReturnValue(false),
  } as any,
};
const dataStorage = dataStorageAccess(mockStorageApi);
let sessionStore = configureStore({
  reducer: combineReducers({
    session: sessionSlice.reducer,
  }),
});
const localKeyStore = new BrowserStorageKeyStore();
localKeyStore.configure({
  storage: mockStorageApi as BrowserStorageConfigParams["storage"],
});
const keyManager = new KeyManager({
  keyStore: localKeyStore,
});
keyManager.registerEncrypter(ScryptEncrypter);

export { dataStorage, sessionStore, keyManager, mockStorageApi };
