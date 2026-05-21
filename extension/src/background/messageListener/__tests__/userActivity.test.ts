import { userActivity } from "../handlers/userActivity";

jest.mock("background/helpers/account", () => ({
  getIsHardwareWalletActive: jest.fn().mockResolvedValue(false),
}));

const makeSessionStore = (state: any) =>
  ({
    getState: () => ({ session: state }),
  }) as any;

const makeSessionTimer = () =>
  ({
    resetSession: jest.fn().mockResolvedValue(undefined),
    startSession: jest.fn().mockResolvedValue(undefined),
    stopSession: jest.fn().mockResolvedValue(undefined),
  }) as any;

const makeLocalStore = () =>
  ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn(),
    remove: jest.fn(),
  }) as any;

describe("userActivity handler", () => {
  it("resets the session timer when the wallet is unlocked (hot wallet)", async () => {
    const sessionTimer = makeSessionTimer();
    const result = await userActivity({
      sessionStore: makeSessionStore({ hashKey: { key: "deadbeef" } }),
      sessionTimer,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: true });
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
  });

  it("rejects when the wallet is locked", async () => {
    const sessionTimer = makeSessionTimer();
    const result = await userActivity({
      sessionStore: makeSessionStore({ hashKey: { key: "" } }),
      sessionTimer,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: false });
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
  });

  it("rejects when a hardware wallet is active but locked", async () => {
    const { getIsHardwareWalletActive } = jest.requireMock(
      "background/helpers/account",
    );
    (getIsHardwareWalletActive as jest.Mock).mockResolvedValueOnce(true);
    const sessionTimer = makeSessionTimer();
    const result = await userActivity({
      sessionStore: makeSessionStore({
        hashKey: { key: "" },
        isHardwareWalletLocked: true,
      }),
      sessionTimer,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: false });
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
  });

  it("resets when a hardware wallet is active and unlocked", async () => {
    const { getIsHardwareWalletActive } = jest.requireMock(
      "background/helpers/account",
    );
    (getIsHardwareWalletActive as jest.Mock).mockResolvedValueOnce(true);
    const sessionTimer = makeSessionTimer();
    const result = await userActivity({
      sessionStore: makeSessionStore({ hashKey: { key: "" } }),
      sessionTimer,
      localStore: makeLocalStore(),
    });
    expect(result).toEqual({ ok: true });
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
  });
});
