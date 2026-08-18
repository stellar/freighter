jest.mock("@shared/api/internal", () => ({
  getCachedSwapTopTokens: jest.fn(),
  cacheSwapTopTokens: jest.fn(),
}));

import {
  getCachedSwapTopTokens,
  cacheSwapTopTokens,
} from "@shared/api/internal";
import {
  getPersistedPopularTokens,
  setPersistedPopularTokens,
} from "../swapPopularTokensCache";
import { POPULAR_TOKENS_STALE_MS } from "popup/ducks/cache";

const getMock = getCachedSwapTopTokens as jest.Mock;
const cacheMock = cacheSwapTopTokens as jest.Mock;

const tokens = [
  { code: "AQUA", issuer: "GBNZ", domain: null, volume7d: 5 },
] as any;

describe("swapPopularTokensCache", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns fresh tokens from the background cache", async () => {
    getMock.mockResolvedValue({ tokens, updatedAt: Date.now() });
    expect(await getPersistedPopularTokens("PUBLIC")).toEqual(tokens);
    expect(getMock).toHaveBeenCalledWith("PUBLIC");
  });

  it("returns null when the background has nothing cached", async () => {
    getMock.mockResolvedValue(null);
    expect(await getPersistedPopularTokens("PUBLIC")).toBeNull();
  });

  it("returns null when the cached entry is older than the staleness window", async () => {
    getMock.mockResolvedValue({
      tokens,
      updatedAt: Date.now() - POPULAR_TOKENS_STALE_MS - 1,
    });
    expect(await getPersistedPopularTokens("PUBLIC")).toBeNull();
  });

  it("swallows a messaging error and returns null", async () => {
    getMock.mockRejectedValue(new Error("messaging failed"));
    expect(await getPersistedPopularTokens("PUBLIC")).toBeNull();
  });

  it("writes through cacheSwapTopTokens", async () => {
    cacheMock.mockResolvedValue(undefined);
    await setPersistedPopularTokens("PUBLIC", tokens);
    expect(cacheMock).toHaveBeenCalledWith("PUBLIC", tokens);
  });

  it("swallows a write error (best-effort)", async () => {
    cacheMock.mockRejectedValue(new Error("write failed"));
    await expect(
      setPersistedPopularTokens("PUBLIC", tokens),
    ).resolves.toBeUndefined();
  });
});
