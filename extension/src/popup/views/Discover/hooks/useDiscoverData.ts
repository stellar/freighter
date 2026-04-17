import { useCallback, useEffect, useReducer, useState } from "react";
import { captureException } from "@sentry/browser";

import { getDiscoverData, getRecentProtocols } from "@shared/api/internal";
import { DiscoverData, RecentProtocolEntry } from "@shared/api/types";
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

  const allProtocols = state.data ?? [];
  const allowedProtocols = allProtocols.filter((p) => !p.isBlacklisted);

  const trendingItems = allowedProtocols.filter((p) => p.isTrending);

  const recentItems = recentEntries
    .map((entry) =>
      allowedProtocols.find((p) => p.websiteUrl === entry.websiteUrl),
    )
    .filter(Boolean) as DiscoverData;

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
