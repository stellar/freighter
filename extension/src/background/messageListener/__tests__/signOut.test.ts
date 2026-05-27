import { SERVICE_TYPES } from "@shared/constants/services";

import { lockHardwareWallet, logOut } from "background/ducks/session";
import { signOut } from "../handlers/signOut";

const mockFlushSessionStore = jest.fn().mockResolvedValue(undefined);
const mockBroadcastSessionState = jest.fn().mockResolvedValue(undefined);

jest.mock("background/store", () => ({
  flushSessionStore: (...args: unknown[]) => mockFlushSessionStore(...args),
}));

jest.mock("background/messageListener/helpers/broadcast-session-state", () => ({
  broadcastSessionState: (...args: unknown[]) =>
    mockBroadcastSessionState(...args),
}));

describe("signOut handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stops the alarm before mutating session state and broadcasts the lock", async () => {
    const localStore = {
      getItem: jest.fn().mockResolvedValue("MNEMONIC_PHRASE_CONFIRMED"),
      remove: jest.fn().mockResolvedValue(undefined),
    } as any;
    const sessionStore = {
      dispatch: jest.fn(),
      getState: jest.fn().mockReturnValue({
        session: { publicKey: "" },
      }),
    } as any;
    const sessionTimer = {
      stopSession: jest.fn().mockResolvedValue(undefined),
    } as any;

    await signOut({ localStore, sessionStore, sessionTimer });

    expect(sessionTimer.stopSession).toHaveBeenCalledTimes(1);
    expect(mockFlushSessionStore).toHaveBeenCalledWith(sessionStore);
    expect(localStore.remove).toHaveBeenCalledTimes(1);
    expect(mockBroadcastSessionState).toHaveBeenCalledWith(
      SERVICE_TYPES.SESSION_LOCKED,
    );

    // stopSession must run before any state mutation so a pending
    // alarm can't fire `clearSession` (and emit a duplicate
    // SESSION_LOCKED broadcast) between the dispatch and the clear.
    expect(
      sessionTimer.stopSession.mock.invocationCallOrder[0],
    ).toBeLessThan(sessionStore.dispatch.mock.invocationCallOrder[0]);
    expect(
      sessionStore.dispatch.mock.invocationCallOrder[0],
    ).toBeLessThan(mockFlushSessionStore.mock.invocationCallOrder[0]);
    expect(
      mockFlushSessionStore.mock.invocationCallOrder[0],
    ).toBeLessThan(localStore.remove.mock.invocationCallOrder[0]);
    expect(
      localStore.remove.mock.invocationCallOrder[0],
    ).toBeLessThan(mockBroadcastSessionState.mock.invocationCallOrder[0]);
  });

  // Regression: `logOut` resets session state to `initialState`, which
  // sets `isHardwareWalletLocked: false`. `KEY_ID` (`hw:…` prefix) is
  // intentionally not cleared on sign-out, so
  // `getIsHardwareWalletActive` still returns `true` afterwards — which
  // means `buildHasPrivateKeySelector`'s HW branch would falsely
  // report the wallet UNLOCKED for HW users after an explicit
  // sign-out. The handler must also dispatch `lockHardwareWallet()`.
  it("dispatches lockHardwareWallet alongside logOut so HW sessions are locked on sign-out", async () => {
    const localStore = {
      getItem: jest.fn().mockResolvedValue("MNEMONIC_PHRASE_CONFIRMED"),
      remove: jest.fn().mockResolvedValue(undefined),
    } as any;
    const sessionStore = {
      dispatch: jest.fn(),
      getState: jest.fn().mockReturnValue({
        session: { publicKey: "" },
      }),
    } as any;
    const sessionTimer = {
      stopSession: jest.fn().mockResolvedValue(undefined),
    } as any;

    await signOut({ localStore, sessionStore, sessionTimer });

    const dispatched = sessionStore.dispatch.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(dispatched).toEqual(
      expect.arrayContaining([logOut(), lockHardwareWallet()]),
    );
    // lockHardwareWallet must run *after* logOut so logOut's
    // initialState reset (which sets isHardwareWalletLocked: false)
    // does not undo the HW-lock flag.
    const logOutIdx = dispatched.findIndex(
      (a: { type?: string }) => a?.type === logOut.type,
    );
    const lockHwIdx = dispatched.findIndex(
      (a: { type?: string }) => a?.type === lockHardwareWallet.type,
    );
    expect(logOutIdx).toBeGreaterThanOrEqual(0);
    expect(lockHwIdx).toBeGreaterThan(logOutIdx);
  });
});
