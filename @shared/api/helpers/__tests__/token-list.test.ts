import { getCombinedAssetListData } from "../token-list";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
  NETWORKS,
} from "@shared/constants/stellar";
import {
  DEFAULT_ASSETS_LISTS,
  AssetsListItem,
} from "@shared/constants/soroban/asset-list";

// Mock Sentry captureException
jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

import { captureException } from "@sentry/browser";

describe("getCombinedAssetListData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch globally
    global.fetch = jest.fn() as jest.Mock;
  });

  it("should handle 429 rate limit error gracefully and continue with other lists", async () => {
    const mockSuccessResponse = {
      name: "Test Asset List",
      provider: "Test Provider",
      description: "Test Description",
      version: "1.0.0",
      network: "mainnet",
      assets: [
        {
          code: "TEST",
          issuer: "GABCDEF123",
          contract: "C123456",
          domain: "test.com",
          icon: "https://test.com/icon.png",
          decimals: 7,
        },
      ],
    };

    // Mock fetch to return 429 for Soroswap URL and success for others
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("soroswap/token-list")) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        });
      }
      // Return success for other URLs
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });
    });

    const result = await getCombinedAssetListData({
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });

    // Should return successful lists (excluding the 429 one)
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain(null);
    expect(result).not.toContain(undefined);

    // Verify that captureException was called for the 429 error
    expect(captureException).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load asset list"),
    );
    expect(captureException).toHaveBeenCalledWith(
      expect.stringContaining("(429)"),
    );
  });

  it("should handle network errors gracefully", async () => {
    const mockSuccessResponse = {
      name: "Test Asset List",
      provider: "Test Provider",
      description: "Test Description",
      version: "1.0.0",
      network: "mainnet",
      assets: [],
    };

    // Mock fetch to throw network error for Soroswap URL
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("soroswap/token-list")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });
    });

    const result = await getCombinedAssetListData({
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });

    // Should return successful lists (excluding the failed one)
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain(null);

    // Verify that captureException was called for the network error
    expect(captureException).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load asset list"),
    );
  });

  it("should handle 500 server errors gracefully", async () => {
    const mockSuccessResponse = {
      name: "Test Asset List",
      provider: "Test Provider",
      description: "Test Description",
      version: "1.0.0",
      network: "mainnet",
      assets: [],
    };

    // Mock fetch to return 500 for Soroswap URL
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("soroswap/token-list")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });
    });

    const result = await getCombinedAssetListData({
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });

    // Should return successful lists (excluding the 500 one)
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain(null);

    // Verify that captureException was called
    expect(captureException).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load asset list"),
    );
    expect(captureException).toHaveBeenCalledWith(
      expect.stringContaining("(500)"),
    );
  });

  it("should handle JSON parsing errors gracefully", async () => {
    const mockSuccessResponse = {
      name: "Test Asset List",
      provider: "Test Provider",
      description: "Test Description",
      version: "1.0.0",
      network: "mainnet",
      assets: [],
    };

    // Mock fetch to return invalid JSON for Soroswap URL
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("soroswap/token-list")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("Invalid JSON");
          },
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });
    });

    const result = await getCombinedAssetListData({
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });

    // Should return successful lists (excluding the invalid JSON one)
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain(null);

    // Verify that captureException was called for JSON parsing error
    expect(captureException).toHaveBeenCalledWith(
      expect.stringContaining("Failed to parse asset list JSON"),
    );
  });

  it("should return all successful lists when all requests succeed", async () => {
    const mockSuccessResponse = {
      name: "Test Asset List",
      provider: "Test Provider",
      description: "Test Description",
      version: "1.0.0",
      network: "mainnet",
      assets: [],
    };

    // Mock all fetches to succeed
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSuccessResponse,
    });

    const result = await getCombinedAssetListData({
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });

    // Should return all enabled lists
    const enabledLists = DEFAULT_ASSETS_LISTS[NETWORKS.PUBLIC].filter(
      (list: AssetsListItem) => list.isEnabled,
    );
    expect(result.length).toBe(enabledLists.length);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("should handle testnet network correctly", async () => {
    const mockSuccessResponse = {
      name: "Test Asset List",
      provider: "Test Provider",
      description: "Test Description",
      version: "1.0.0",
      network: "testnet",
      assets: [],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSuccessResponse,
    });

    const result = await getCombinedAssetListData({
      networkDetails: TESTNET_NETWORK_DETAILS,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });

    expect(result.length).toBeGreaterThan(0);
  });
});
