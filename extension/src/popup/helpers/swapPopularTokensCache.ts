import {
  cacheSwapTopTokens,
  getCachedSwapTopTokens,
} from "@shared/api/internal";
import { POPULAR_TOKENS_STALE_MS } from "popup/ducks/cache";
import { TrendingAsset } from "popup/helpers/trendingAssets";

/**
 * Disk-backed (chrome.storage.local) cache of the stellar.expert top-tokens
 * (trending) list, keyed per network. The storage write itself lives in the
 * background (the GET/CACHE_SWAP_TOP_TOKENS message handlers own
 * chrome.storage.local, matching every other cache in the codebase); this
 * popup-side wrapper just messages the background and applies the 30-min
 * staleness window (§5.3). Unlike the in-memory Redux + module caches, it
 * survives popup close, so reopening paints Popular from disk instead of
 * re-running the slow trending request. Returns null when the entry is absent
 * or stale so the caller fetches fresh. Best-effort: any messaging error
 * degrades to a network fetch.
 */
export const getPersistedPopularTokens = async (
  network: string,
): Promise<TrendingAsset[] | null> => {
  try {
    const cached = await getCachedSwapTopTokens(network);
    if (
      !cached?.tokens?.length ||
      typeof cached.updatedAt !== "number" ||
      Date.now() - cached.updatedAt >= POPULAR_TOKENS_STALE_MS
    ) {
      return null;
    }
    return cached.tokens as TrendingAsset[];
  } catch (e) {
    return null;
  }
};

export const setPersistedPopularTokens = async (
  network: string,
  tokens: TrendingAsset[],
): Promise<void> => {
  try {
    await cacheSwapTopTokens(network, tokens);
  } catch (e) {
    // Best-effort: a write failure just means we re-fetch next time.
  }
};
