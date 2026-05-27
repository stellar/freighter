import { SERVICE_TYPES } from "@shared/constants/services";

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

  it("flushes the session store before clearing temporary storage and broadcasting the lock", async () => {
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

    expect(mockFlushSessionStore).toHaveBeenCalledWith(sessionStore);
    expect(localStore.remove).toHaveBeenCalledTimes(1);
    expect(mockBroadcastSessionState).toHaveBeenCalledWith(
      SERVICE_TYPES.SESSION_LOCKED,
    );
    expect(
      mockFlushSessionStore.mock.invocationCallOrder[0],
    ).toBeLessThan(localStore.remove.mock.invocationCallOrder[0]);
    expect(
      mockBroadcastSessionState.mock.invocationCallOrder[0],
    ).toBeGreaterThan(mockFlushSessionStore.mock.invocationCallOrder[0]);
  });
});
