import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";

const mockGetAnalyticsUserId = jest.fn();
jest.mock("background/helpers/analyticsUserId", () => ({
  getAnalyticsUserId: (...args: unknown[]) => mockGetAnalyticsUserId(...args),
}));

// Exercise the dev-server carve-out: DEV_SERVER on, with an explicit
// DEV_SERVER_URL. The guard must admit only the dev-server popup relay
// (senders on DEV_SERVER_URL) and still reject every other dev-mode tab,
// since the content script forwards arbitrary internal types when
// DEV_EXTENSION is on. DEV_SERVER/DEV_SERVER_URL are captured at import time
// in @shared/constants/services, so they are mocked here rather than toggled
// per-test.
const DEV_SERVER_ORIGIN = "http://localhost:9000/";
jest.mock("@shared/constants/services", () => ({
  ...jest.requireActual("@shared/constants/services"),
  DEV_SERVER: true,
  DEV_SERVER_URL: "http://localhost:9000/",
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

describe("GET_ANALYTICS_USER_ID dev-server carve-out", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAnalyticsUserId.mockResolvedValue("pub123");
  });

  it("admits the dev-server popup relay (sender on DEV_SERVER_URL)", async () => {
    const result = await popupMessageListener(
      { type: SERVICE_TYPES.GET_ANALYTICS_USER_ID } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
      { tab: { id: 1 }, url: `${DEV_SERVER_ORIGIN}index.html?mode=popup` } as any,
    );

    expect(result).toEqual({ analyticsUserId: "pub123" });
    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(1);
  });

  it("rejects a dev-mode tab that is not the dev server, even with DEV_SERVER on", async () => {
    const result = await popupMessageListener(
      { type: SERVICE_TYPES.GET_ANALYTICS_USER_ID } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
      { tab: { id: 2 }, url: "https://evil.example.com/" } as any,
    );

    expect(result).toEqual({ error: "Unauthorized" });
    expect(mockGetAnalyticsUserId).not.toHaveBeenCalled();
  });
});
