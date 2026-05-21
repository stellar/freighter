import {
  deriveKeyFromString,
  encryptHashString,
  decryptHashString,
  SessionTimer,
  SESSION_ALARM_NAME,
} from "../session";
import browser from "webextension-polyfill";
import { AUTO_LOCK_TIMEOUT_MINUTES_ID } from "constants/localStorageTypes";
import { DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES } from "@shared/constants/autoLock";

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
