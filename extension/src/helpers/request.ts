import { Action, IdleState, RequestState, State } from "constants/request";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

export const isError = <T>(response: T | Error): response is Error => {
  if (response instanceof Error) {
    return true;
  }
  return false;
};

export const initialState: IdleState = {
  state: RequestState.IDLE,
  data: null,
  error: null,
};

export const reducer = <T, K>(
  state: State<T, K>,
  action: Action<T, K>,
): State<T, K> => {
  switch (action.type) {
    case "FETCH_DATA_START":
      return { state: RequestState.LOADING, error: null, data: null };
    case "FETCH_DATA_SUCCESS":
      return { error: null, state: RequestState.SUCCESS, data: action.payload };
    case "FETCH_DATA_ERROR":
      return { data: null, state: RequestState.ERROR, error: action.payload };
    default:
      return state;
  }
};

/** Default staleness window for `updatedAt`-stamped session caches. */
export const DEFAULT_CACHE_STALE_MS = 180000; // 3 minutes

/** Whether an `updatedAt`-stamped cache entry is still within `staleMs`. */
export const isCacheValid = (
  cachedData?: { updatedAt: number },
  staleMs: number = DEFAULT_CACHE_STALE_MS,
) => Boolean(cachedData && cachedData.updatedAt > Date.now() - staleMs);
