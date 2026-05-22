import { userActivity } from "../handlers/userActivity";

const makeSessionTimer = () =>
  ({
    resetSession: jest.fn().mockResolvedValue(undefined),
    startSession: jest.fn().mockResolvedValue(undefined),
    stopSession: jest.fn().mockResolvedValue(undefined),
  }) as any;

describe("userActivity handler", () => {
  it("resets the session timer on every ping", async () => {
    // The caller-side guards (popup-side `useActivityPing` only attaches
    // listeners while unlocked, and `popupMessageListener` gates this
    // message behind `isFromExtensionPage`) mean the handler is reached
    // only on genuine user activity. The handler itself unconditionally
    // rearms the idle alarm.
    const sessionTimer = makeSessionTimer();
    const result = await userActivity({ sessionTimer });
    expect(result).toEqual({ ok: true });
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
  });
});
