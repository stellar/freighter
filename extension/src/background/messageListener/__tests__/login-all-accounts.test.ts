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
}));

jest.mock("background/store", () => ({
  flushSessionStore: (...args: unknown[]) => mockFlushSessionStore(...args),
}));

jest.mock("../helpers/broadcast-session-state", () => ({
  broadcastSessionState: (...args: unknown[]) =>
    mockBroadcastSessionState(...args),
}));

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
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
      });
    mockGetStoredAccounts.mockResolvedValue([{ publicKey: "GBACTIVE" }]);
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
    expect(
      mockFlushSessionStore.mock.invocationCallOrder[0],
    ).toBeLessThan(mockBroadcastSessionState.mock.invocationCallOrder[0]);
  });

  // Regression: the two catch blocks call `clearSession()` (which wipes
  // hashKey, sets `isHardwareWalletLocked=true`, removes
  // TEMPORARY_STORE_ID), but previously did not return/throw. Execution
  // continued to the unconditional `startSession()` + `flushSessionStore()`
  // + `broadcastSessionState(SESSION_UNLOCKED)` at the bottom, telling
  // every Freighter surface the wallet was unlocked even though it had
  // just been cleared. Both catches must rethrow so the caller knows the
  // unlock failed and the unlock broadcast does not fire.
  it("rethrows and does not broadcast SESSION_UNLOCKED when storing the active mnemonic fails", async () => {
    mockStoreEncryptedTemporaryData.mockReset();
    mockStoreEncryptedTemporaryData.mockRejectedValueOnce(
      new Error("storage offline"),
    );

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
});
