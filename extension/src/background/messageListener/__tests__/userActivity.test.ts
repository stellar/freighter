import { TEMPORARY_STORE_ID } from "constants/localStorageTypes";

import { userActivity } from "../handlers/userActivity";

const mockGetIsHardwareWalletActive = jest.fn();
jest.mock("background/helpers/account", () => ({
  getIsHardwareWalletActive: (...args: unknown[]) =>
    mockGetIsHardwareWalletActive(...args),
}));

const makeSessionTimer = () =>
  ({
    resetSession: jest.fn().mockResolvedValue(undefined),
    startSession: jest.fn().mockResolvedValue(undefined),
    stopSession: jest.fn().mockResolvedValue(undefined),
  }) as any;

const makeSessionStore = (state: any) =>
  ({
    getState: () => state,
  }) as any;

const makeLocalStore = (temporaryStore: Record<string, string> = {}) =>
  ({
    getItem: jest.fn((key: string) =>
      Promise.resolve(key === TEMPORARY_STORE_ID ? temporaryStore : null),
    ),
  }) as any;

describe("userActivity handler", () => {
  beforeEach(() => {
    mockGetIsHardwareWalletActive.mockReset();
  });

  it("resets the timer when the hot wallet is unlocked", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(false);
    const sessionTimer = makeSessionTimer();
    const sessionStore = makeSessionStore({
      session: {
        hashKey: { key: "abc" },
        isHardwareWalletLocked: false,
      },
    });
    const result = await userActivity({
      sessionTimer,
      sessionStore,
      localStore: makeLocalStore({ "key-id-0": "encrypted-blob" }),
    });
    expect(result).toEqual({ ok: true });
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
  });

  it("does NOT reset the timer when the hash key exists but the temporary store is empty", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(false);
    const sessionTimer = makeSessionTimer();
    const sessionStore = makeSessionStore({
      session: {
        hashKey: { key: "abc" },
        isHardwareWalletLocked: false,
      },
    });
    const result = await userActivity({
      sessionTimer,
      sessionStore,
      localStore: makeLocalStore({}),
    });
    expect(result).toEqual({ ok: false });
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
  });

  it("resets the timer when a hardware wallet is active and unlocked", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(true);
    const sessionTimer = makeSessionTimer();
    const sessionStore = makeSessionStore({
      session: {
        publicKey: "GBHW",
        hashKey: { key: "" },
        isHardwareWalletLocked: false,
      },
    });
    const result = await userActivity({
      sessionTimer,
      sessionStore,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: true });
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
  });

  it("does NOT reset the timer when the wallet is locked", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(false);
    const sessionTimer = makeSessionTimer();
    const sessionStore = makeSessionStore({
      session: {
        hashKey: { key: "" },
        isHardwareWalletLocked: false,
      },
    });
    const result = await userActivity({
      sessionTimer,
      sessionStore,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: false });
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
  });

  it("does NOT reset the timer when a hardware wallet is active but locked", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(true);
    const sessionTimer = makeSessionTimer();
    const sessionStore = makeSessionStore({
      session: {
        publicKey: "GBHW",
        hashKey: { key: "" },
        isHardwareWalletLocked: true,
      },
    });
    const result = await userActivity({
      sessionTimer,
      sessionStore,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: false });
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
  });

  // After the browser wipes `storage.session`, the session has no public
  // key and `isHardwareWalletLocked` falls back to `false`. That session
  // is locked, so activity must not rearm the idle alarm.
  it("does NOT reset the timer for a wiped hardware-wallet session with no public key", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(true);
    const sessionTimer = makeSessionTimer();
    const sessionStore = makeSessionStore({
      session: {
        publicKey: "",
        hashKey: { key: "" },
        isHardwareWalletLocked: false,
      },
    });
    const result = await userActivity({
      sessionTimer,
      sessionStore,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: false });
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
  });
});
