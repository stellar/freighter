import { CacheSwapTopTokensMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_SWAP_TOP_TOKENS_ID } from "constants/localStorageTypes";

export const cacheSwapTopTokens = async ({
  request,
  localStore,
}: {
  request: CacheSwapTopTokensMessage;
  localStore: DataStorageAccess;
}) => {
  const cache = (await localStore.getItem(CACHED_SWAP_TOP_TOKENS_ID)) || {};
  cache[request.network] = {
    tokens: request.tokens,
    updatedAt: Date.now(),
  };
  await localStore.setItem(CACHED_SWAP_TOP_TOKENS_ID, cache);
  // The popup caller destructures `const { error } = ...`, so resolve to an
  // object rather than undefined (which would throw on destructure).
  return {};
};
