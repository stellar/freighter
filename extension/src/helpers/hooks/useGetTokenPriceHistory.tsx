import { useCallback, useEffect, useReducer, useRef } from "react";
import { captureException } from "@sentry/browser";
import { useDispatch, useStore } from "react-redux";

import { getTokenPriceHistory } from "@shared/api/internal";
import {
  ApiTokenPriceHistory,
  TokenPriceHistoryRange,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  beginCacheWrite,
  canWriteCache,
  joinInFlight,
  priceHistoryCacheKey,
} from "helpers/cacheWrites";
import { initialState, isCacheValid, reducer } from "helpers/request";
import { emitMetric } from "helpers/metrics";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getTokenType } from "popup/helpers/token";
import { hasChartData } from "popup/helpers/tokenPriceHistory";
import {
  PRICE_HISTORY_STALE_MS,
  saveTokenPriceHistory,
  tokenPriceHistorySelector,
} from "popup/ducks/cache";
import { AppDispatch, AppState } from "popup/App";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

export type TokenPriceHistoryRangeValue = `${TokenPriceHistoryRange}`;

export interface GetTokenPriceHistoryData {
  type: AppDataType.RESOLVED;
  // null = the fetch failed (errors degrade to null); an empty series is NOT
  // null — it resolves with points: [].
  history: ApiTokenPriceHistory | null;
  range: TokenPriceHistoryRangeValue;
}

interface TokenPriceHistoryQuery {
  token: string;
  range: TokenPriceHistoryRangeValue;
  networkDetails: NetworkDetails;
}

/**
 * Reads the store at call time rather than a render-captured value so rapid
 * range switches see the latest entries. Null on miss or expiry.
 */
const readCachedHistory = (
  state: AppState,
  { token, range, networkDetails }: TokenPriceHistoryQuery,
): ApiTokenPriceHistory | null => {
  const cached = (tokenPriceHistorySelector(state) || {})[
    networkDetails.networkPassphrase
  ]?.[token]?.[range];
  if (!isCacheValid(cached, PRICE_HISTORY_STALE_MS)) {
    return null;
  }
  const { updatedAt: _updatedAt, ...history } = cached!;
  return history;
};

export function useGetTokenPriceHistory() {
  const reduxDispatch = useDispatch<AppDispatch>();
  const store = useStore<AppState>();

  const [state, dispatch] = useReducer(
    reducer<GetTokenPriceHistoryData, unknown>,
    initialState,
  );
  // Monotonic tag for the race guard: a response only lands if no newer
  // fetch has started since it left. UI-only — cache writes are ordered by the
  // module-scope claims in `helpers/cacheWrites`, because unmount bumps this id
  // but must not discard a cache write, and because a close/reopen replaces
  // this ref while the old instance's request is still in flight.
  const latestFetchIdRef = useRef(0);

  /**
   * Unmount supersedes in-flight fetches so a late response neither emits nor
   * dispatches. The id is bumped rather than aborted so the cache write stays.
   */
  useEffect(
    () => () => {
      latestFetchIdRef.current += 1;
    },
    [],
  );

  /** Whether `query` can be served from the session cache without a fetch. */
  const isRangeCached = useCallback(
    (query: TokenPriceHistoryQuery) =>
      readCachedHistory(store.getState(), query) !== null,
    [store],
  );

  /**
   * Shows the loading state for a debounced range switch and supersedes
   * anything in flight, so the previous range's response cannot land.
   */
  const startLoading = useCallback(() => {
    latestFetchIdRef.current += 1;
    dispatch({ type: "FETCH_DATA_START" });
  }, []);

  /**
   * Cache-only: no analytics (six `loaded` events per open would skew the
   * metrics), no dispatch, no race-guard tag, no Sentry.
   */
  const warmRange = useCallback(
    async (query: TokenPriceHistoryQuery): Promise<void> => {
      // Re-read the cache immediately before requesting: the previous range in
      // the queue took a round trip to settle, and the user's own fetch may
      // have filled this entry in the meantime.
      if (readCachedHistory(store.getState(), query) !== null) {
        return;
      }

      try {
        const history = await joinInFlight(
          priceHistoryCacheKey({
            networkPassphrase: query.networkDetails.networkPassphrase,
            token: query.token,
            range: query.range,
          }),
          () => getTokenPriceHistory(query),
        );
        // Re-checked after the round trip: the user may have fetched this range
        // mid-flight, and a slower warm must not overwrite it or re-stamp
        // `updatedAt`.
        if (readCachedHistory(store.getState(), query) !== null) {
          return;
        }
        reduxDispatch(saveTokenPriceHistory({ ...query, history }));
      } catch {
        // Silent by design — see the no-Sentry, no-retry note above.
      }
    },
    [reduxDispatch, store],
  );

  const fetchData = useCallback(
    async ({
      token,
      range,
      networkDetails,
    }: TokenPriceHistoryQuery): Promise<GetTokenPriceHistoryData> => {
      latestFetchIdRef.current += 1;
      const fetchId = latestFetchIdRef.current;
      const isSuperseded = () => latestFetchIdRef.current !== fetchId;

      dispatch({ type: "FETCH_DATA_START" });

      const payload: GetTokenPriceHistoryData = {
        type: AppDataType.RESOLVED,
        history: null,
        range,
      };

      const cachedHistory = readCachedHistory(store.getState(), {
        token,
        range,
        networkDetails,
      });

      if (cachedHistory) {
        // Nothing can have superseded this call yet: no await since the id was
        // assigned. No `token_chart.loaded` here — it is scoped to network
        // fetches on both platforms so `has_data` counts one observation per
        // fetch; `token_chart.viewed` covers cache hits.
        payload.history = cachedHistory;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        return payload;
      }

      // Claimed immediately before the request goes out, and shared across
      // hook instances: only the newest request for THIS key may write, or an
      // older response landing second overwrites newer data and re-stamps it
      // fresh. A close/reopen crosses instances, so a per-instance ref is not
      // enough.
      const cacheKey = priceHistoryCacheKey({
        networkPassphrase: networkDetails.networkPassphrase,
        token,
        range,
      });
      const writeClaim = beginCacheWrite(cacheKey);

      try {
        const history = await joinInFlight(cacheKey, () =>
          getTokenPriceHistory({ token, range, networkDetails }),
        );

        if (canWriteCache(cacheKey, writeClaim)) {
          reduxDispatch(
            saveTokenPriceHistory({ networkDetails, token, range, history }),
          );
        }
        payload.history = history;
      } catch (e) {
        // Transport failures only; a no-data 200 resolves above and is never
        // reported. Pass the Error itself so Sentry keeps the type and stack.
        captureException(e, {
          tags: { operation: "getTokenPriceHistory" },
          extra: { token, range, network: networkDetails.network },
        });
        payload.history = null;
      }

      if (isSuperseded()) {
        // A newer range owns the UI; discard this response silently. No outcome
        // event either — `token_chart.loaded` describes what the user was
        // actually shown, so a response the UI never renders must not emit one.
        return payload;
      }

      if (payload.history) {
        // Frozen cross-platform shape: `low_volume` only when true, `has_data`
        // means at least 2 points (matches mobile).
        emitMetric(METRIC_NAMES.tokenChartLoaded, {
          token_type: getTokenType(token, networkDetails.networkPassphrase),
          has_data: hasChartData(payload.history.points),
          ...(payload.history.lowVolume === true ? { low_volume: true } : {}),
          range,
        });
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    },
    [reduxDispatch, store],
  );

  return {
    state,
    fetchData,
    warmRange,
    isRangeCached,
    startLoading,
  };
}
