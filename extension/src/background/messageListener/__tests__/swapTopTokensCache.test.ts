import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { CACHED_SWAP_TOP_TOKENS_ID } from "constants/localStorageTypes";
import { SERVICE_TYPES } from "@shared/constants/services";

import { cacheSwapTopTokens } from "../handlers/cacheSwapTopTokens";
import { getCachedSwapTopTokens } from "../handlers/getCachedSwapTopTokens";

const tokens = [{ code: "AQUA", issuer: "GBNZ", domain: null, volume7d: 5 }];

const cacheRequest = (network: string, t: unknown[]) =>
  ({
    type: SERVICE_TYPES.CACHE_SWAP_TOP_TOKENS,
    network,
    tokens: t,
    activePublicKey: null,
  }) as any;

const getRequest = (network: string) =>
  ({
    type: SERVICE_TYPES.GET_CACHED_SWAP_TOP_TOKENS,
    network,
    activePublicKey: null,
  }) as any;

describe("swap top-tokens cache handlers", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(CACHED_SWAP_TOP_TOKENS_ID);
  });

  it("caches tokens per network with a timestamp and reads them back", async () => {
    await cacheSwapTopTokens({
      request: cacheRequest("PUBLIC", tokens),
      localStore: mockDataStorage,
    });

    const { cachedSwapTopTokens } = await getCachedSwapTopTokens({
      request: getRequest("PUBLIC"),
      localStore: mockDataStorage,
    });

    expect(cachedSwapTopTokens?.tokens).toEqual(tokens);
    expect(typeof cachedSwapTopTokens?.updatedAt).toBe("number");
  });

  it("returns null for a network with nothing cached", async () => {
    const { cachedSwapTopTokens } = await getCachedSwapTopTokens({
      request: getRequest("PUBLIC"),
      localStore: mockDataStorage,
    });
    expect(cachedSwapTopTokens).toBeNull();
  });

  it("scopes cached entries per network", async () => {
    await cacheSwapTopTokens({
      request: cacheRequest("PUBLIC", tokens),
      localStore: mockDataStorage,
    });

    const { cachedSwapTopTokens } = await getCachedSwapTopTokens({
      request: getRequest("TESTNET"),
      localStore: mockDataStorage,
    });
    expect(cachedSwapTopTokens).toBeNull();
  });
});
