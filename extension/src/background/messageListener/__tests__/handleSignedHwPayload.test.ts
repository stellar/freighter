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

  it("still records user activity before returning an error for a missing uuid", async () => {
    const sessionTimer = makeSessionTimer();

    const result = await handleSignedHwPayload({
      request: { signedPayload: "signed-xdr" } as any,
      responseQueue: [] as any,
      sessionTimer,
    });

    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ error: "Transaction not found" });
  });

  it("tracks hardware-wallet lock and unlock state transitions", () => {
    let state = { session: sessionSlice.reducer(undefined, { type: "init" }) };
    expect(isHardwareWalletLockedSelector(state)).toBe(false);

    state = { session: sessionSlice.reducer(state.session, lockHardwareWallet()) };
    expect(isHardwareWalletLockedSelector(state)).toBe(true);

    state = {
      session: sessionSlice.reducer(state.session, unlockHardwareWallet()),
    };
    expect(isHardwareWalletLockedSelector(state)).toBe(false);
  });
});
