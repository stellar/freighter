import { SERVICE_TYPES } from "@shared/constants/services";
import { KEY_ID, TEMPORARY_STORE_ID } from "constants/localStorageTypes";

import { loginToAllAccounts } from "../helpers/login-all-accounts";

const mockGetKeyIdList = jest.fn();
const mockGetIsHardwareWalletActive = jest.fn();
const mockUnlockKeystore = jest.fn();
const mockGetStoredAccounts = jest.fn();
const mockClearSession = jest.fn().mockResolvedValue(undefined);
const mockDeriveKeyFromString = jest.fn();
const mockStoreEncryptedTemporaryData = jest.fn().mockResolvedValue(undefined);
const mockStoreMnemonics = jest.fn().mockResolvedValue(undefined);
const mockGetPhraseSourceId = jest.fn(
  async (mnemonic: string) => `id:${mnemonic}`,
);
const mockStoreActiveHashKey = jest.fn().mockResolvedValue(undefined);
const mockFlushSessionStore = jest.fn().mockResolvedValue(undefined);
const mockBroadcastSessionState = jest.fn().mockResolvedValue(undefined);

jest.mock("background/helpers/account", () => ({
  HW_PREFIX: "hw:",
  getIsHardwareWalletActive: (...args: unknown[]) =>
    mockGetIsHardwareWalletActive(...args),
  getKeyIdList: (...args: unknown[]) => mockGetKeyIdList(...args),
}));

jest.mock("../helpers/unlock-keystore", () => ({
  unlockKeystore: (...args: unknown[]) => mockUnlockKeystore(...args),
}));

jest.mock("../helpers/get-stored-accounts", () => ({
  getStoredAccounts: (...args: unknown[]) => mockGetStoredAccounts(...args),
}));

jest.mock("background/helpers/session", () => ({
  SessionTimer: jest.fn(),
  clearSession: (...args: unknown[]) => mockClearSession(...args),
  deriveKeyFromString: (...args: unknown[]) => mockDeriveKeyFromString(...args),
  storeActiveHashKey: (...args: unknown[]) => mockStoreActiveHashKey(...args),
  storeEncryptedTemporaryData: (...args: unknown[]) =>
    mockStoreEncryptedTemporaryData(...args),
  storeMnemonics: (...args: unknown[]) => mockStoreMnemonics(...args),
}));

jest.mock("background/helpers/secret-sources", () => ({
  getPhraseSourceId: (mnemonic: string) => mockGetPhraseSourceId(mnemonic),
}));

jest.mock("background/store", () => ({
  flushSessionStore: (...args: unknown[]) => mockFlushSessionStore(...args),
}));

jest.mock("../helpers/broadcast-session-state", () => ({
  broadcastSessionState: (...args: unknown[]) =>
    mockBroadcastSessionState(...args),
}));

const mockCaptureException = jest.fn();
jest.mock("@sentry/browser", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

describe("loginToAllAccounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetKeyIdList.mockResolvedValue(["key-id-0"]);
    mockGetIsHardwareWalletActive.mockResolvedValue(false);
    mockUnlockKeystore
      .mockResolvedValueOnce({
        publicKey: "GBACTIVE",
        extra: { mnemonicPhrase: "mnemonic phrase" },
      })
      .mockResolvedValueOnce({
        privateKey: "SSECRET",
        extra: { mnemonicPhrase: "mnemonic phrase" },
      });
    mockGetStoredAccounts.mockResolvedValue([{ publicKey: "GBACTIVE" }]);
    mockStoreMnemonics.mockReset();
    mockStoreMnemonics.mockResolvedValue(undefined);
    mockGetPhraseSourceId.mockImplementation(
      async (mnemonic: string) => `id:${mnemonic}`,
    );
    mockDeriveKeyFromString.mockResolvedValue({ key: "derived-key" });
  });

  it("flushes persisted session state before broadcasting SESSION_UNLOCKED", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === KEY_ID) {
          return Promise.resolve("key-id-0");
        }
        return Promise.resolve(null);
      }),
      remove: jest.fn().mockImplementation((key: string) => {
        if (key === TEMPORARY_STORE_ID) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      }),
    } as any;
    const sessionStore = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn().mockReturnValue({
        session: {
          publicKey: "",
          allAccounts: [],
        },
      }),
    } as any;
    const keyManager = {} as any;
    const sessionTimer = {
      startSession: jest.fn().mockResolvedValue(undefined),
    } as any;

    await loginToAllAccounts(
      "password",
      localStore,
      sessionStore,
      keyManager,
      sessionTimer,
    );

    expect(mockFlushSessionStore).toHaveBeenCalledWith(sessionStore);
    expect(mockBroadcastSessionState).toHaveBeenCalledWith(
      SERVICE_TYPES.SESSION_UNLOCKED,
    );
    expect(mockFlushSessionStore.mock.invocationCallOrder[0]).toBeLessThan(
      mockBroadcastSessionState.mock.invocationCallOrder[0],
    );
  });

  // Regression: the two catch blocks call `clearSession()` (which wipes
  // hashKey, sets `isHardwareWalletLocked=true`, removes
  // TEMPORARY_STORE_ID), but previously did not return/throw. Execution
  // continued to the unconditional `startSession()` + `flushSessionStore()`
  // + `broadcastSessionState(SESSION_UNLOCKED)` at the bottom, telling
  // every Freighter surface the wallet was unlocked even though it had
  // just been cleared. Both catches must rethrow so the caller knows the
  // unlock failed and the unlock broadcast does not fire.
  it("rethrows and does not broadcast SESSION_UNLOCKED when storing the mnemonic map fails", async () => {
    mockStoreMnemonics.mockReset();
    mockStoreMnemonics.mockRejectedValueOnce(new Error("storage offline"));

    const localStore = {
      getItem: jest.fn().mockResolvedValue(""),
      remove: jest.fn().mockResolvedValue(undefined),
    } as any;
    const sessionStore = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      getState: jest
        .fn()
        .mockReturnValue({ session: { publicKey: "", allAccounts: [] } }),
    } as any;
    const sessionTimer = {
      startSession: jest.fn().mockResolvedValue(undefined),
    } as any;

    await expect(
      loginToAllAccounts(
        "password",
        localStore,
        sessionStore,
        {} as any,
        sessionTimer,
      ),
    ).rejects.toThrow("storage offline");

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(sessionTimer.startSession).not.toHaveBeenCalled();
    expect(mockBroadcastSessionState).not.toHaveBeenCalled();
  });

  it("rethrows and does not broadcast SESSION_UNLOCKED when storing the active hash key fails", async () => {
    mockStoreActiveHashKey.mockReset();
    mockStoreActiveHashKey.mockRejectedValueOnce(new Error("hash key write"));

    const localStore = {
      getItem: jest.fn().mockResolvedValue(""),
      remove: jest.fn().mockResolvedValue(undefined),
    } as any;
    const sessionStore = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      getState: jest
        .fn()
        .mockReturnValue({ session: { publicKey: "", allAccounts: [] } }),
    } as any;
    const sessionTimer = {
      startSession: jest.fn().mockResolvedValue(undefined),
    } as any;

    await expect(
      loginToAllAccounts(
        "password",
        localStore,
        sessionStore,
        {} as any,
        sessionTimer,
      ),
    ).rejects.toThrow("hash key write");

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(sessionTimer.startSession).not.toHaveBeenCalled();
    expect(mockBroadcastSessionState).not.toHaveBeenCalled();
  });

  describe("held phrases", () => {
    const makeStores = () => {
      const localStore = {
        getItem: jest
          .fn()
          .mockImplementation((key: string) =>
            Promise.resolve(key === KEY_ID ? "key-id-0" : null),
          ),
        remove: jest.fn().mockResolvedValue(undefined),
      } as any;
      const sessionStore = {
        dispatch: jest.fn().mockResolvedValue(undefined),
        getState: jest
          .fn()
          .mockReturnValue({ session: { publicKey: "", allAccounts: [] } }),
      } as any;
      const sessionTimer = {
        startSession: jest.fn().mockResolvedValue(undefined),
      } as any;
      return { localStore, sessionStore, sessionTimer };
    };

    const useKeystores = (keystores: Record<string, unknown>) => {
      mockGetKeyIdList.mockResolvedValue(Object.keys(keystores));
      mockUnlockKeystore.mockReset();
      mockUnlockKeystore.mockImplementation(async ({ keyID }: any) => {
        if (!(keyID in keystores)) {
          throw new Error(`no keystore ${keyID}`);
        }
        return keystores[keyID];
      });
    };

    const login = async () => {
      const { localStore, sessionStore, sessionTimer } = makeStores();
      await loginToAllAccounts(
        "password",
        localStore,
        sessionStore,
        {} as any,
        sessionTimer,
      );
    };

    it("stores every distinct held phrase under its source id", async () => {
      useKeystores({
        "key-id-0": {
          publicKey: "GA",
          privateKey: "SA",
          extra: { imported: false, mnemonicPhrase: "phrase a" },
        },
        "key-id-1": {
          publicKey: "GB",
          privateKey: "SB",
          extra: { imported: false, mnemonicPhrase: "phrase b" },
        },
        // a secret-key import still stamped with the active phrase
        "key-id-2": {
          publicKey: "GC",
          privateKey: "SC",
          extra: { imported: true, mnemonicPhrase: "phrase a" },
        },
      });

      await login();

      expect(mockStoreMnemonics).toHaveBeenCalledTimes(1);
      expect(mockStoreMnemonics.mock.calls[0][0].mnemonics).toEqual({
        "id:phrase a": "phrase a",
        "id:phrase b": "phrase b",
      });
      expect(
        mockStoreEncryptedTemporaryData.mock.calls.map(
          ([{ keyName, temporaryData }]) => [keyName, temporaryData],
        ),
      ).toEqual([
        ["key-id-0", "SA"],
        ["key-id-1", "SB"],
        ["key-id-2", "SC"],
      ]);
    });

    it("derives each phrase's source id once", async () => {
      useKeystores({
        "key-id-0": {
          publicKey: "GA",
          privateKey: "SA",
          extra: { imported: false, mnemonicPhrase: "phrase a" },
        },
        "key-id-1": {
          publicKey: "GB",
          privateKey: "SB",
          extra: { imported: false, mnemonicPhrase: "phrase a" },
        },
      });

      await login();

      expect(mockGetPhraseSourceId).toHaveBeenCalledTimes(1);
    });

    it("writes no mnemonic map for a secret-key-only wallet", async () => {
      useKeystores({
        "key-id-0": {
          publicKey: "GA",
          privateKey: "SA",
          extra: { imported: true, mnemonicPhrase: "" },
        },
        "key-id-1": { publicKey: "GB", privateKey: "SB" },
      });

      await login();

      expect(mockStoreMnemonics).not.toHaveBeenCalled();
      expect(mockStoreEncryptedTemporaryData).toHaveBeenCalledTimes(2);
      expect(mockBroadcastSessionState).toHaveBeenCalledWith(
        SERVICE_TYPES.SESSION_UNLOCKED,
      );
    });

    it("never opens a hardware keystore or counts it as a source", async () => {
      useKeystores({
        "key-id-0": {
          publicKey: "GA",
          privateKey: "SA",
          extra: { imported: false, mnemonicPhrase: "phrase a" },
        },
        "hw:GHARDWARE": {},
      });

      await login();

      expect(mockUnlockKeystore).not.toHaveBeenCalledWith(
        expect.objectContaining({ keyID: "hw:GHARDWARE" }),
      );
      expect(mockStoreMnemonics.mock.calls[0][0].mnemonics).toEqual({
        "id:phrase a": "phrase a",
      });
    });

    it("skips a phrase whose id cannot be derived and still unlocks", async () => {
      useKeystores({
        "key-id-0": {
          publicKey: "GA",
          privateKey: "SA",
          extra: { imported: false, mnemonicPhrase: "phrase a" },
        },
        "key-id-1": {
          publicKey: "GB",
          privateKey: "SB",
          extra: { imported: false, mnemonicPhrase: "not bip39" },
        },
      });
      mockGetPhraseSourceId.mockImplementation(async (mnemonic: string) => {
        if (mnemonic === "not bip39") {
          throw new Error("Invalid mnemonic (see bip39)");
        }
        return `id:${mnemonic}`;
      });

      await login();

      expect(mockStoreMnemonics.mock.calls[0][0].mnemonics).toEqual({
        "id:phrase a": "phrase a",
      });
      expect(mockCaptureException).toHaveBeenCalledTimes(1);
      expect(mockBroadcastSessionState).toHaveBeenCalledWith(
        SERVICE_TYPES.SESSION_UNLOCKED,
      );
    });

    it("writes the map after the private keys and before the hash key", async () => {
      useKeystores({
        "key-id-0": {
          publicKey: "GA",
          privateKey: "SA",
          extra: { imported: false, mnemonicPhrase: "phrase a" },
        },
      });

      await login();

      const lastKeyWrite = Math.max(
        ...mockStoreEncryptedTemporaryData.mock.invocationCallOrder,
      );
      expect(lastKeyWrite).toBeLessThan(
        mockStoreMnemonics.mock.invocationCallOrder[0],
      );
      expect(mockStoreMnemonics.mock.invocationCallOrder[0]).toBeLessThan(
        mockStoreActiveHashKey.mock.invocationCallOrder[0],
      );
    });
  });
});
