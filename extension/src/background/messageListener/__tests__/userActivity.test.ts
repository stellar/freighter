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

const makeLocalStore = () => ({}) as any;

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
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: true });
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
  });

  it("resets the timer when a hardware wallet is active and unlocked", async () => {
    mockGetIsHardwareWalletActive.mockResolvedValue(true);
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
});
