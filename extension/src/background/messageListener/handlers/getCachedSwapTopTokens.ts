import { GetCachedSwapTopTokensMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_SWAP_TOP_TOKENS_ID } from "constants/localStorageTypes";

interface CachedSwapTopTokensEntry {
  tokens: unknown[];
  updatedAt: number;
}

export const getCachedSwapTopTokens = async ({
  request,
  localStore,
}: {
  request: GetCachedSwapTopTokensMessage;
  localStore: DataStorageAccess;
}): Promise<{ cachedSwapTopTokens: CachedSwapTopTokensEntry | null }> => {
  const cache = (await localStore.getItem(CACHED_SWAP_TOP_TOKENS_ID)) || {};
  return { cachedSwapTopTokens: cache[request.network] || null };
};
