import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { captureException } from "@sentry/browser";

import { getDiscoverData, getRecentProtocols } from "@shared/api/internal";
import {
  DiscoverData,
  ProtocolEntry,
  RecentProtocolEntry,
} from "@shared/api/types";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";

export const useDiscoverData = () => {
  const [state, dispatch] = useReducer(
    reducer<DiscoverData, unknown>,
    initialState,
  );
  const [recentEntries, setRecentEntries] = useState<RecentProtocolEntry[]>([]);

  const fetchData = useCallback(async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const [protocols, entries] = await Promise.all([
        getDiscoverData(),
        getRecentProtocols(),
      ]);
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: protocols });
      setRecentEntries(entries);
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      captureException(`Error loading discover data - ${error}`);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshRecent = useCallback(async () => {
    const entries = await getRecentProtocols();
    setRecentEntries(entries);
  }, []);

  const allowedProtocols = useMemo(
    () => (state.data ?? []).filter((p) => !p.isBlacklisted),
    [state.data],
  );

  const trendingItems = useMemo(
    () => allowedProtocols.filter((p) => p.isTrending),
    [allowedProtocols],
  );

  const recentItems = useMemo(
    () =>
      recentEntries
        .map((entry) =>
          allowedProtocols.find((p) => p.websiteUrl === entry.websiteUrl),
        )
        .filter((p): p is ProtocolEntry => p !== undefined),
    [recentEntries, allowedProtocols],
  );

  const dappsItems = allowedProtocols;

  return {
    isLoading:
      state.state === RequestState.IDLE || state.state === RequestState.LOADING,
    error: state.error,
    trendingItems,
    recentItems,
    dappsItems,
    refreshRecent,
    retry: fetchData,
  };
};
