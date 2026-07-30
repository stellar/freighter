/**
 * Data hook for the redesigned (v2, state-change-driven) History view.
 *
 * Orchestrates app data + balances + one cursor-paginated page of
 * /accounts/{address}/transactions, resolves the referenced tokens, maps the
 * payload to the normalized HistoryEntry model, filters it, and groups it
 * into month sections. fetchNextPage appends subsequent pages.
 *
 * The use_history_v2 flag is read from the store at fetch time (mirroring
 * useGetTokenPrices) so a freshly resolved Amplitude flag isn't missed by a
 * render-captured value. When the router serves v1 (flag off at fetch time or
 * an unsupported network), the resolved payload carries fallbackToV1 so the
 * view renders the legacy history instead. (The U8 horizon adapter will map
 * v1 payloads into this model and remove that marker.)
 */

import { useReducer, useRef, useState } from "react";
import { useSelector, useStore } from "react-redux";
import { captureException } from "@sentry/browser";

import { getAccountHistoryWithFlag } from "@shared/api/internal";
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
import { AppState } from "popup/App";
import { historyV2Selector } from "popup/ducks/remoteConfig";
import { tokensListsSelector } from "popup/ducks/cache";
import { buildTokenContext } from "popup/helpers/history/tokenResolver";
import { filterHistoryEntries } from "popup/helpers/history/filters";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { HistoryEntry } from "popup/views/AccountHistory/model";
import {
  collectTokenIds,
  mapV2Transaction,
} from "popup/views/AccountHistory/mappers/v2";
import { V2AccountTransaction } from "@shared/api/types/backend-api";

export const HISTORY_V2_PAGE_SIZE = 25;

export interface HistoryEntrySection {
  /** "{month}:{year}" — same format the v1 sections use (getMonthLabel) */
  monthYear: string;
  entries: HistoryEntry[];
}

export interface ResolvedHistoryV2 {
  type: AppDataType.RESOLVED;
  publicKey: string;
  applicationState: APPLICATION_STATE;
  balances: AccountBalances;
  sections: HistoryEntrySection[];
  /** v1 payload came back — render the legacy history until U8 lands */
  fallbackToV1: boolean;
  hasNextPage: boolean;
}

export type HistoryDataV2 = ResolvedHistoryV2 | NeedsReRoute;

export const groupEntriesByMonth = (
  entries: HistoryEntry[],
): HistoryEntrySection[] =>
  entries.reduce((sections, entry) => {
    const date = new Date(Date.parse(entry.createdAt));
    const monthYear = `${date.getMonth()}:${date.getFullYear()}`;

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
  const store = useStore<AppState>();
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
    const tokens = await buildTokenContext({
      tokenIds: collectTokenIds(transactions),
      networkDetails: target.networkDetails,
      balances: target.balances,
      assetsListsData: cachedTokenLists,
    });
    const entries = transactions.map((tx) =>
      mapV2Transaction(tx, {
        tokens,
        publicKey: target.publicKey,
        nativeTokenId,
      }),
    );
    return filterHistoryEntries(entries, { isHideDustEnabled, nativeTokenId });
  };

  const resolvedPayload = (
    target: FetchTarget,
    {
      fallbackToV1,
      hasNextPage,
    }: { fallbackToV1: boolean; hasNextPage: boolean },
  ): ResolvedHistoryV2 => ({
    type: AppDataType.RESOLVED,
    publicKey: target.publicKey,
    applicationState: target.applicationState,
    balances: target.balances,
    sections: groupEntriesByMonth(entriesRef.current),
    fallbackToV1,
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

      // Read the flag from the store at call time (not a render-captured
      // value) so a freshly resolved Amplitude flag isn't missed.
      const useV2 = historyV2Selector(store.getState());
      const result = await getAccountHistoryWithFlag(
        publicKey,
        networkDetails,
        useV2,
        { limit: pageSize },
      );

      let payload: ResolvedHistoryV2;
      if (result.version === "v1") {
        entriesRef.current = [];
        cursorRef.current = null;
        payload = resolvedPayload(target, {
          fallbackToV1: true,
          hasNextPage: false,
        });
      } else {
        entriesRef.current = await mapPage(result.page.data, target);
        cursorRef.current = result.page.pagination.next_cursor;
        payload = resolvedPayload(target, {
          fallbackToV1: false,
          hasNextPage: result.page.pagination.has_next,
        });
      }

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
      const useV2 = historyV2Selector(store.getState());
      const result = await getAccountHistoryWithFlag(
        target.publicKey,
        target.networkDetails,
        useV2,
        { limit: pageSize, cursor: cursorRef.current },
      );
      if (result.version !== "v2") {
        cursorRef.current = null;
        return;
      }

      entriesRef.current = [
        ...entriesRef.current,
        ...(await mapPage(result.page.data, target)),
      ];
      cursorRef.current = result.page.pagination.next_cursor;
      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: resolvedPayload(target, {
          fallbackToV1: false,
          hasNextPage: result.page.pagination.has_next,
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
