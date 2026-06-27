import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorageAccess";
import { POPULAR_TOKENS_STALE_MS } from "popup/ducks/cache";
import { TrendingAsset } from "popup/helpers/trendingAssets";

const localStore = dataStorageAccess(browserLocalStorage);

const storageKey = (network: string) => `swap_top_tokens_${network}`;

interface PersistedPopularTokens {
  tokens: TrendingAsset[];
  updatedAt: number;
}

/**
 * Disk-backed (chrome.storage.local) cache of the stellar.expert top-tokens
 * (trending) list, keyed per network. Unlike the in-memory Redux + module
 * caches, it survives popup close — so reopening the extension paints Popular
 * from disk instead of re-running the slow, server-computed trending request
 * (§5.3). Uses the same 30-min staleness window as the Redux cache and returns
 * null when the entry is absent or stale, so the caller fetches fresh.
 * Best-effort: any storage error degrades to a network fetch.
 */
export const getPersistedPopularTokens = async (
  network: string,
): Promise<TrendingAsset[] | null> => {
  try {
    const cached: PersistedPopularTokens | undefined = await localStore.getItem(
      storageKey(network),
    );
    if (
      !cached?.tokens?.length ||
      typeof cached.updatedAt !== "number" ||
      Date.now() - cached.updatedAt >= POPULAR_TOKENS_STALE_MS
    ) {
      return null;
    }
    return cached.tokens;
  } catch (e) {
    return null;
  }
};

export const setPersistedPopularTokens = async (
  network: string,
  tokens: TrendingAsset[],
): Promise<void> => {
  try {
    await localStore.setItem(storageKey(network), {
      tokens,
      updatedAt: Date.now(),
    } as PersistedPopularTokens);
  } catch (e) {
    // Best-effort: a write failure just means we re-fetch next time.
  }
};
