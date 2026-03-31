import { useCallback, useEffect, useReducer } from "react";
import { captureException } from "@sentry/browser";

import { getDiscoverData } from "@shared/api/internal";
import { DiscoverData } from "@shared/api/types";
import {
  getRecentProtocols,
  RecentProtocolEntry,
} from "popup/helpers/recentProtocols";

interface DiscoverDataState {
  isLoading: boolean;
  error: unknown | null;
  allProtocols: DiscoverData;
  recentEntries: RecentProtocolEntry[];
}

type Action =
  | { type: "FETCH_START" }
  | {
      type: "FETCH_SUCCESS";
      payload: {
        protocols: DiscoverData;
        recentEntries: RecentProtocolEntry[];
      };
    }
  | { type: "FETCH_ERROR"; payload: unknown }
  | { type: "REFRESH_RECENT"; payload: RecentProtocolEntry[] };

const initialState: DiscoverDataState = {
  isLoading: true,
  error: null,
  allProtocols: [],
  recentEntries: [],
};

const reducer = (
  state: DiscoverDataState,
  action: Action,
): DiscoverDataState => {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        isLoading: false,
        error: null,
        allProtocols: action.payload.protocols,
        recentEntries: action.payload.recentEntries,
      };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "REFRESH_RECENT":
      return { ...state, recentEntries: action.payload };
    default:
      return state;
  }
};

export const useDiscoverData = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchData = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const [protocols, recentEntries] = await Promise.all([
        getDiscoverData(),
        getRecentProtocols(),
      ]);
      dispatch({
        type: "FETCH_SUCCESS",
        payload: { protocols, recentEntries },
      });
    } catch (error) {
      dispatch({ type: "FETCH_ERROR", payload: error });
      captureException(`Error loading discover data - ${error}`);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshRecent = useCallback(async () => {
    const recentEntries = await getRecentProtocols();
    dispatch({ type: "REFRESH_RECENT", payload: recentEntries });
  }, []);

  const allowedProtocols = state.allProtocols.filter((p) => !p.isBlacklisted);

  const trendingItems = allowedProtocols.filter((p) => p.isTrending);

  const recentItems = state.recentEntries
    .map((entry) =>
      allowedProtocols.find((p) => p.websiteUrl === entry.websiteUrl),
    )
    .filter(Boolean) as DiscoverData;

  const dappsItems = allowedProtocols;

  return {
    isLoading: state.isLoading,
    error: state.error,
    trendingItems,
    recentItems,
    dappsItems,
    allProtocols: allowedProtocols,
    refreshRecent,
  };
};
