import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";

const mockGetAnalyticsUserId = jest.fn();
jest.mock("background/helpers/analyticsUserId", () => ({
  getAnalyticsUserId: (...args: unknown[]) => mockGetAnalyticsUserId(...args),
}));

// DEV_SERVER is captured as a module-level constant at import time (see
// @shared/constants/services), and config/jest/setupTests.tsx sets the
// backing global true for every suite (needed elsewhere for the
// FETCH_BACKEND_V2 dev-server popup-relay carve-out). Force it false here so
// the isFromExtensionPage guard test below exercises the real production
// gate rather than the dev-server bypass. This doesn't affect the two
// extension-page tests above: isFromExtensionPage is already true for them,
// which short-circuits the `!isFromExtensionPage && !DEV_SERVER` guard
// regardless of DEV_SERVER's value.
jest.mock("@shared/constants/services", () => ({
  ...jest.requireActual("@shared/constants/services"),
  DEV_SERVER: false,
}));

const mockSessionStore = {
  getState: jest.fn().mockReturnValue({ session: { publicKey: "" } }),
} as any;

const mockLocalStore = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
} as any;

const mockKeyManager = {} as any;
const mockSessionTimer = {} as any;

describe("GET_ANALYTICS_USER_ID", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves to the analytics user id returned by getAnalyticsUserId", async () => {
    mockGetAnalyticsUserId.mockResolvedValue("pub123");

    const result = await popupMessageListener(
      { type: SERVICE_TYPES.GET_ANALYTICS_USER_ID } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
      {},
    );

    expect(result).toEqual({ analyticsUserId: "pub123" });
    expect(mockGetAnalyticsUserId).toHaveBeenCalledWith(
      mockSessionStore,
      mockLocalStore,
    );
  });

  it("resolves to null when getAnalyticsUserId returns null", async () => {
    mockGetAnalyticsUserId.mockResolvedValue(null);

    const result = await popupMessageListener(
      { type: SERVICE_TYPES.GET_ANALYTICS_USER_ID } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
      {},
    );

    expect(result).toEqual({ analyticsUserId: null });
  });

  it("returns Unauthorized when sender is a content script (dev-mode web page), mirroring FETCH_BACKEND_V2's isFromExtensionPage guard", async () => {
    const contentScriptSender = { tab: { id: 1 } };
    const result = await popupMessageListener(
      { type: SERVICE_TYPES.GET_ANALYTICS_USER_ID } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
      contentScriptSender,
    );

    expect(result).toEqual({ error: "Unauthorized" });
    expect(mockGetAnalyticsUserId).not.toHaveBeenCalled();
  });
});
