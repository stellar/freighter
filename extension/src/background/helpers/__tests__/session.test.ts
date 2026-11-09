import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";

import {
  addMnemonic,
  deriveKeyFromString,
  encryptHashString,
  decryptHashString,
  getMnemonic,
  getMnemonics,
  SessionTimer,
  SESSION_ALARM_NAME,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
  storeMnemonics,
} from "../session";
import browser from "webextension-polyfill";
import {
  AUTO_LOCK_TIMEOUT_MINUTES_ID,
  TEMPORARY_STORE_ID,
  TEMPORARY_STORE_MNEMONICS_ID,
} from "constants/localStorageTypes";
import { DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES } from "@shared/constants/autoLock";
import {
  buildHasPrivateKeySelector,
  sessionSlice,
} from "background/ducks/session";
import { getIsHardwareWalletActive } from "background/helpers/account";

jest.mock("background/helpers/account", () => ({
  getIsHardwareWalletActive: jest.fn(),
}));

describe("session", () => {
  it("should be able to encrypt and decrypt a string", async () => {
    const password = "password";
    const privateKey = "privateKey";

    const { key } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should be able to encrypt and decrypt a very long string with different characters", async () => {
    const password =
      "passwordpasswordpasswordpasswordpasswordpassworw21w1w1@@@@dpasswordpasswordpasswordpcxassad@@@@asswordpasswordpasswordpasswordpassword";
    const privateKey = "privateKeyprivateKeyprivateKeyprivateKey";

    const { key } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should be able to encrypt and decrypt an empty string", async () => {
    const password = "";
    const privateKey = "";

    const { key } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should produce different ciphertexts for the same plaintext", async () => {
    const password = "password";
    const privateKey = "privateKey";

    const { key } = await deriveKeyFromString(password);

    const encrypted1 = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const encrypted2 = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const bytes1 = new Uint8Array(encrypted1);
    const bytes2 = new Uint8Array(encrypted2);
    const areEqual =
      bytes1.length === bytes2.length &&
      bytes1.every((val, i) => val === bytes2[i]);

    expect(areEqual).toBe(false);
  });
});

describe("SessionTimer", () => {
  const createMock = jest.fn().mockResolvedValue(undefined);
  const clearMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    createMock.mockClear();
    clearMock.mockClear();
    (browser as any).alarms = { create: createMock, clear: clearMock };
  });

  const makeLocalStore = (stored: unknown) =>
    ({
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === AUTO_LOCK_TIMEOUT_MINUTES_ID)
          return Promise.resolve(stored);
        return Promise.resolve(null);
      }),
      setItem: jest.fn(),
      remove: jest.fn(),
    }) as any;

  it("resetSession arms the alarm using the stored timeout", async () => {
    const timer = new SessionTimer(makeLocalStore(30));
    await timer.resetSession();
    expect(createMock).toHaveBeenCalledWith(SESSION_ALARM_NAME, {
      delayInMinutes: 30,
    });
  });

  it("startSession is an alias for resetSession", async () => {
    const timer = new SessionTimer(makeLocalStore(5));
    await timer.startSession();
    expect(createMock).toHaveBeenCalledWith(SESSION_ALARM_NAME, {
      delayInMinutes: 5,
    });
  });

  it("falls back to the default when no timeout is persisted", async () => {
    const timer = new SessionTimer(makeLocalStore(null));
    await timer.resetSession();
    expect(createMock).toHaveBeenCalledWith(SESSION_ALARM_NAME, {
      delayInMinutes: DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
    });
  });

  it("falls back to the default when the persisted value is invalid", async () => {
    const timer = new SessionTimer(makeLocalStore(7));
    await timer.resetSession();
    expect(createMock).toHaveBeenCalledWith(SESSION_ALARM_NAME, {
      delayInMinutes: DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
    });
  });

  it("re-reads the persisted timeout on every reset", async () => {
    const localStore = {
      getItem: jest.fn().mockResolvedValueOnce(15).mockResolvedValueOnce(60),
      setItem: jest.fn(),
      remove: jest.fn(),
    } as any;
    const timer = new SessionTimer(localStore);
    await timer.resetSession();
    await timer.resetSession();
    expect(createMock).toHaveBeenNthCalledWith(1, SESSION_ALARM_NAME, {
      delayInMinutes: 15,
    });
    expect(createMock).toHaveBeenNthCalledWith(2, SESSION_ALARM_NAME, {
      delayInMinutes: 60,
    });
  });

  it("stopSession clears the alarm", async () => {
    const timer = new SessionTimer(makeLocalStore(15));
    await timer.stopSession();
    expect(clearMock).toHaveBeenCalledWith(SESSION_ALARM_NAME);
  });
});

describe("buildHasPrivateKeySelector", () => {
  const mockGetIsHardwareWalletActive =
    getIsHardwareWalletActive as jest.MockedFunction<
      typeof getIsHardwareWalletActive
    >;

  beforeEach(() => {
    mockGetIsHardwareWalletActive.mockResolvedValue(false);
  });

  it("returns true when the hash key exists and the temporary store is populated", async () => {
    const selector = buildHasPrivateKeySelector({
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === TEMPORARY_STORE_ID) {
          return Promise.resolve({ "key-id-0": "encrypted-blob" });
        }
        return Promise.resolve(null);
      }),
    } as any);

    await expect(
      selector({ session: { hashKey: { key: "hash-key" } } } as any),
    ).resolves.toBe(true);
  });

  it("returns false when the hash key exists but the temporary store is empty", async () => {
    const selector = buildHasPrivateKeySelector({
      getItem: jest.fn().mockResolvedValue({}),
    } as any);

    await expect(
      selector({ session: { hashKey: { key: "hash-key" } } } as any),
    ).resolves.toBe(false);
  });

  it("returns true for unlocked hardware-wallet sessions", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(true);
    const selector = buildHasPrivateKeySelector({
      getItem: jest.fn().mockResolvedValue(null),
    } as any);

    await expect(
      selector({ session: { isHardwareWalletLocked: false } } as any),
    ).resolves.toBe(true);
  });
});

describe("mnemonic map in the temporary store", () => {
  // One real PBKDF2 derivation for the whole block; it is the slow part.
  let hashKey: { key: CryptoKey };

  const makeSessionStore = () =>
    configureStore({
      reducer: combineReducers({ session: sessionSlice.reducer }),
    });

  const makeLocalStore = () => {
    const data: Record<string, unknown> = {};
    return {
      data,
      store: {
        getItem: jest.fn(async (key: string) => data[key]),
        setItem: jest.fn(async (key: string, value: unknown) => {
          data[key] = value;
        }),
        remove: jest.fn(async (key: string) => {
          delete data[key];
        }),
      } as any,
    };
  };

  beforeAll(async () => {
    hashKey = await deriveKeyFromString("password");
  });

  it("round-trips a map of source id to mnemonic", async () => {
    const { store } = makeLocalStore();
    const sessionStore = makeSessionStore();
    await storeActiveHashKey({ sessionStore, hashKey });

    await storeMnemonics({
      localStore: store,
      hashKey,
      mnemonics: { "id-a": "phrase a", "id-b": "phrase b" },
    });

    expect(await getMnemonics({ sessionStore, localStore: store })).toEqual({
      "id-a": "phrase a",
      "id-b": "phrase b",
    });
  });

  it("stores the map as one encrypted entry, not as plaintext", async () => {
    const { store, data } = makeLocalStore();

    await storeMnemonics({
      localStore: store,
      hashKey,
      mnemonics: { "id-a": "phrase a" },
    });

    const temporaryStore = data[TEMPORARY_STORE_ID] as Record<string, string>;
    expect(Object.keys(temporaryStore)).toEqual([TEMPORARY_STORE_MNEMONICS_ID]);
    expect(temporaryStore[TEMPORARY_STORE_MNEMONICS_ID]).not.toContain(
      "phrase a",
    );
  });

  it("returns an empty map when no mnemonics are stored", async () => {
    const { store } = makeLocalStore();
    const sessionStore = makeSessionStore();
    await storeActiveHashKey({ sessionStore, hashKey });

    expect(await getMnemonics({ sessionStore, localStore: store })).toEqual({});
  });

  it("returns an empty map when the session is locked", async () => {
    const { store } = makeLocalStore();
    await storeMnemonics({
      localStore: store,
      hashKey,
      mnemonics: { "id-a": "phrase a" },
    });

    expect(
      await getMnemonics({
        sessionStore: makeSessionStore(),
        localStore: store,
      }),
    ).toEqual({});
  });

  it("addMnemonic merges into the held map and leaves other entries alone", async () => {
    const { store, data } = makeLocalStore();
    const sessionStore = makeSessionStore();
    await storeActiveHashKey({ sessionStore, hashKey });
    await storeEncryptedTemporaryData({
      localStore: store,
      keyName: "key-id-0",
      temporaryData: "SSECRET",
      hashKey,
    });
    await storeMnemonics({
      localStore: store,
      hashKey,
      mnemonics: { "id-a": "phrase a" },
    });

    await addMnemonic({
      localStore: store,
      hashKey,
      sourceId: "id-b",
      mnemonic: "phrase b",
    });

    expect(await getMnemonics({ sessionStore, localStore: store })).toEqual({
      "id-a": "phrase a",
      "id-b": "phrase b",
    });
    expect(
      Object.keys(data[TEMPORARY_STORE_ID] as Record<string, string>),
    ).toEqual(["key-id-0", TEMPORARY_STORE_MNEMONICS_ID]);
  });

  it("addMnemonic works when no map exists yet", async () => {
    const { store } = makeLocalStore();
    const sessionStore = makeSessionStore();
    await storeActiveHashKey({ sessionStore, hashKey });

    await addMnemonic({
      localStore: store,
      hashKey,
      sourceId: "id-a",
      mnemonic: "phrase a",
    });

    expect(await getMnemonics({ sessionStore, localStore: store })).toEqual({
      "id-a": "phrase a",
    });
  });

  it("storeMnemonics replaces the held map rather than merging", async () => {
    const { store } = makeLocalStore();
    const sessionStore = makeSessionStore();
    await storeActiveHashKey({ sessionStore, hashKey });
    await storeMnemonics({
      localStore: store,
      hashKey,
      mnemonics: { "id-a": "phrase a" },
    });

    await storeMnemonics({
      localStore: store,
      hashKey,
      mnemonics: { "id-b": "phrase b" },
    });

    expect(await getMnemonics({ sessionStore, localStore: store })).toEqual({
      "id-b": "phrase b",
    });
  });

  it("getMnemonic returns the phrase for a held id and an empty string otherwise", async () => {
    const { store } = makeLocalStore();
    const sessionStore = makeSessionStore();
    await storeActiveHashKey({ sessionStore, hashKey });
    await storeMnemonics({
      localStore: store,
      hashKey,
      mnemonics: { "id-a": "phrase a" },
    });

    expect(
      await getMnemonic({ sessionStore, localStore: store, sourceId: "id-a" }),
    ).toBe("phrase a");
    expect(
      await getMnemonic({ sessionStore, localStore: store, sourceId: "nope" }),
    ).toBe("");
  });
});
