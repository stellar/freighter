import { handleSignedHwPayload } from "../handlers/handleSignedHwPayload";
import {
  isHardwareWalletLockedSelector,
  lockHardwareWallet,
  sessionSlice,
  unlockHardwareWallet,
} from "background/ducks/session";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const makeSessionTimer = (onReset?: () => void) =>
  ({
    resetSession: jest.fn().mockImplementation(async () => {
      onReset?.();
    }),
    startSession: jest.fn().mockResolvedValue(undefined),
    stopSession: jest.fn().mockResolvedValue(undefined),
  }) as any;

describe("handleSignedHwPayload", () => {
  it("resets the session before resolving the queued hardware-wallet payload", async () => {
    const callOrder: string[] = [];
    const response = jest.fn(() => callOrder.push("response"));
    const sessionTimer = makeSessionTimer(() => callOrder.push("reset"));
    const responseQueue = [{ uuid: "uuid-1", response }];

    const result = await handleSignedHwPayload({
      request: {
        uuid: "uuid-1",
        signedPayload: "signed-xdr",
      } as any,
      responseQueue: responseQueue as any,
      sessionTimer,
    });

    expect(result).toEqual({});
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
    expect(response).toHaveBeenCalledWith("signed-xdr");
    expect(callOrder).toEqual(["reset", "response"]);
    expect(responseQueue).toEqual([]);
  });

  it("does NOT extend the idle alarm when the uuid is missing", async () => {
    const sessionTimer = makeSessionTimer();

    const result = await handleSignedHwPayload({
      request: { signedPayload: "signed-xdr" } as any,
      responseQueue: [] as any,
      sessionTimer,
    });

    // A malformed request is never a legitimate signal of user
    // presence — only the success branch rearms the idle timer.
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "Transaction not found" });
  });

  it("does NOT extend the idle alarm when no queue entry matches", async () => {
    const sessionTimer = makeSessionTimer();

    const result = await handleSignedHwPayload({
      request: { uuid: "uuid-missing", signedPayload: "signed-xdr" } as any,
      responseQueue: [{ uuid: "uuid-other", response: jest.fn() }] as any,
      sessionTimer,
    });

    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "Session timed out" });
  });

  it("tracks hardware-wallet lock and unlock state transitions", () => {
    let state = { session: sessionSlice.reducer(undefined, { type: "init" }) };
    expect(isHardwareWalletLockedSelector(state)).toBe(false);

    state = {
      session: sessionSlice.reducer(state.session, lockHardwareWallet()),
    };
    expect(isHardwareWalletLockedSelector(state)).toBe(true);

    state = {
      session: sessionSlice.reducer(state.session, unlockHardwareWallet()),
    };
    expect(isHardwareWalletLockedSelector(state)).toBe(false);
  });
});
