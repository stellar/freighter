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
import {
  coerceAutoLockTimeoutMinutes,
  AutoLockTimeoutMinutes,
} from "@shared/constants/autoLock";
import { AUTO_LOCK_TIMEOUT_MINUTES_ID } from "constants/localStorageTypes";

const mockStore: Record<string, unknown> = {};
const mockStorageApi = {
  get: jest.fn(async (keys) => {
    const result: Record<string, unknown> = {};

    if (keys === null || keys === undefined) {
      return { ...mockStore };
    }

    if (typeof keys === "string") {
      if (keys in mockStore) {
        result[keys] = mockStore[keys];
      }
    } else if (Array.isArray(keys)) {
      for (const key of keys) {
        if (key in mockStore) {
          result[key] = mockStore[key];
        }
      }
    } else if (typeof keys === "object") {
      for (const key in keys) {
        if (key in mockStore) {
          result[key] = mockStore[key];
        } else {
          result[key] = keys[key];
        }
      }
    }

    return result;
  }),

  set: jest.fn(async (items) => {
    Object.assign(mockStore, items);
  }),

  remove: jest.fn(async (keys) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
      delete mockStore[key];
    }
  }),

  clear: jest.fn(async () => {
    for (const key in mockStore) {
      delete mockStore[key];
    }
  }),

  getBytesInUse: jest.fn(async () => 0),

  getKeys: jest.fn(async () => Object.keys(mockStore)),

  // Just enough to satisfy the type
  onChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    hasListener: jest.fn().mockReturnValue(false),
  } as any,
};
const mockDataStorage = dataStorageAccess(mockStorageApi);
let mockSessionStore = configureStore({
  reducer: combineReducers({
    session: sessionSlice.reducer,
  }),
});
const localKeyStore = new BrowserStorageKeyStore();
localKeyStore.configure({
  storage: mockStorageApi as BrowserStorageConfigParams["storage"],
});
const mockKeyManager = new KeyManager({
  keyStore: localKeyStore,
});
mockKeyManager.registerEncrypter(ScryptEncrypter);

const MOCK_TIMER_DURATION = 60 * 24;

/**
 * Test double for `SessionTimer`. Reads the auto-lock timeout from the
 * mock storage on each `resetSession()` / `startSession()` call so
 * tests can simulate settings changes via `mockStore`. Tracks the
 * number of resets/stops to allow assertions on alarm behavior.
 */
class MockBrowserAlarm {
  duration = 1000 * 60 * MOCK_TIMER_DURATION;
  runningTimeout: null | ReturnType<typeof setTimeout> = null;
  callback: () => void;
  resetCount = 0;
  stopCount = 0;
  lastTimeoutMinutes: AutoLockTimeoutMinutes | null = null;

  constructor(callback: () => unknown, duration?: number) {
    this.duration = duration || this.duration;
    this.callback = callback;
  }

  async startSession() {
    await this.resetSession();
  }

  async resetSession() {
    const stored = mockStore[AUTO_LOCK_TIMEOUT_MINUTES_ID];
    const minutes = coerceAutoLockTimeoutMinutes(stored);
    this.lastTimeoutMinutes = minutes;
    this.duration = 1000 * 60 * minutes;
    this.resetCount += 1;
    if (this.runningTimeout) clearTimeout(this.runningTimeout);

    this.runningTimeout = setTimeout(() => {
      if (this.callback) {
        this.callback();
      }
    }, this.duration);
  }

  async stopSession() {
    this.stopCount += 1;
    if (this.runningTimeout) {
      clearTimeout(this.runningTimeout);
      this.runningTimeout = null;
    }
  }
}

export {
  mockStore,
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
};
