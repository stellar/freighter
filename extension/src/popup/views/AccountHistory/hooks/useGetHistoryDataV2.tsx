/**
 * Data hook for the redesigned (v2, state-change-driven) History view.
 *
 * Orchestrates app data + balances + one cursor-paginated page of
 * /accounts/{address}/transactions, resolves the referenced tokens, maps the
 * payload to the normalized HistoryEntry model, filters it, and groups it
 * into month sections. fetchNextPage appends subsequent pages.
 *
 * This hook is v2-only. The History shell (views/AccountHistory/index.tsx)
 * decides between this view and the legacy one — on the use_history_v2 flag,
 * and on the network, since the v2 backend doesn't index custom networks. There
 * is no fallback to the v1 API from here: a failed v2 fetch surfaces as the
 * view's error state.
 */

import { useReducer, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { getAccountHistoryV2 } from "@shared/api/internal";
import { V2AccountTransaction } from "@shared/api/types/backend-api";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { isMainnet } from "helpers/stellar";
import { tokensListsSelector } from "popup/ducks/cache";
import { getMonthYearKey } from "popup/helpers/date";
import { filterHistoryEntries } from "popup/helpers/history/filters";
import { mapV2Page } from "popup/helpers/history/mapPage";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { HistoryEntry } from "popup/views/AccountHistory/model";

export const HISTORY_V2_PAGE_SIZE = 25;

export interface HistoryEntrySection {
  /** "{month}:{year}" from `getMonthYearKey` — same format the v1 sections use */
  monthYear: string;
  entries: HistoryEntry[];
}

export interface ResolvedHistoryV2 {
  type: AppDataType.RESOLVED;
  publicKey: string;
  applicationState: APPLICATION_STATE;
  balances: AccountBalances;
  sections: HistoryEntrySection[];
  hasNextPage: boolean;
}

export type HistoryDataV2 = ResolvedHistoryV2 | NeedsReRoute;

export const groupEntriesByMonth = (
  entries: HistoryEntry[],
): HistoryEntrySection[] =>
  entries.reduce((sections, entry) => {
    const monthYear = getMonthYearKey(entry.createdAt);

    const lastSection = sections[sections.length - 1];
    if (lastSection?.monthYear === monthYear) {
      lastSection.entries.push(entry);
      return sections;
    }
    return [...sections, { monthYear, entries: [entry] }];
  }, [] as HistoryEntrySection[]);

interface FetchTarget {
  publicKey: string;
  networkDetails: NetworkDetails;
  applicationState: APPLICATION_STATE;
  balances: AccountBalances;
}

export function useGetHistoryDataV2({
  isHideDustEnabled,
  pageSize = HISTORY_V2_PAGE_SIZE,
}: {
  isHideDustEnabled: boolean;
  pageSize?: number;
}) {
  const [state, dispatch] = useReducer(
    reducer<HistoryDataV2, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: true,
  });
  const cachedTokenLists = useSelector(tokensListsSelector);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const entriesRef = useRef<HistoryEntry[]>([]);
  const targetRef = useRef<FetchTarget | null>(null);

  const mapPage = async (
    transactions: V2AccountTransaction[],
    target: FetchTarget,
  ): Promise<HistoryEntry[]> => {
    const nativeTokenId = getNativeContractDetails(
      target.networkDetails,
    ).contract;
    const entries = await mapV2Page({
      transactions,
      publicKey: target.publicKey,
      networkDetails: target.networkDetails,
      balances: target.balances,
      assetsListsData: cachedTokenLists,
    });
    return filterHistoryEntries(entries, { isHideDustEnabled, nativeTokenId });
  };

  const resolvedPayload = (
    target: FetchTarget,
    { hasNextPage }: { hasNextPage: boolean },
  ): ResolvedHistoryV2 => ({
    type: AppDataType.RESOLVED,
    publicKey: target.publicKey,
    applicationState: target.applicationState,
    balances: target.balances,
    sections: groupEntriesByMonth(entriesRef.current),
    hasNextPage,
  });

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }
      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const balancesResult = await fetchBalances(
        publicKey,
        isMainnet(networkDetails),
        networkDetails,
        true,
      );
      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const target: FetchTarget = {
        publicKey,
        networkDetails,
        applicationState: appData.account.applicationState,
        balances: balancesResult,
      };
      targetRef.current = target;

      const page = await getAccountHistoryV2(publicKey, networkDetails, {
        limit: pageSize,
      });

      entriesRef.current = await mapPage(page.data, target);
      cursorRef.current = page.pagination.next_cursor;
      const payload = resolvedPayload(target, {
        hasNextPage: page.pagination.has_next,
      });

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  const fetchNextPage = async () => {
    const target = targetRef.current;
    if (!target || !cursorRef.current || isLoadingMore) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const page = await getAccountHistoryV2(
        target.publicKey,
        target.networkDetails,
        { limit: pageSize, cursor: cursorRef.current },
      );

      entriesRef.current = [
        ...entriesRef.current,
        ...(await mapPage(page.data, target)),
      ];
      cursorRef.current = page.pagination.next_cursor;
      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: resolvedPayload(target, {
          hasNextPage: page.pagination.has_next,
        }),
      });
    } catch (error) {
      // Pagination failures shouldn't blank the already-rendered list —
      // keep the current page and let the next sentinel hit retry.
      captureException(`Failed to fetch history v2 page - ${error}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    state,
    fetchData,
    fetchNextPage,
    isLoadingMore,
  };
}
