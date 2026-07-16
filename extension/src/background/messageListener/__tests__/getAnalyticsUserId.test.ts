import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";

const mockGetAnalyticsUserId = jest.fn();
jest.mock("background/helpers/analyticsUserId", () => ({
  getAnalyticsUserId: (...args: unknown[]) => mockGetAnalyticsUserId(...args),
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
});
