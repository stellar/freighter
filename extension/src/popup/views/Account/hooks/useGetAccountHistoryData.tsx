import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getAccountHistoryV2 } from "@shared/api/internal";
import { isHistoryV2Servable } from "@shared/helpers/stellar";
import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { HistoryResponse, useGetHistory } from "helpers/hooks/useGetHistory";
import { AssetOperations, sortOperationsByAsset } from "popup/helpers/account";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { useTokenDetails } from "helpers/hooks/useTokenDetails";
import {
  homeDomainsSelector,
  saveDomainForIssuer,
  saveIconsForBalances,
  tokensListsSelector,
} from "popup/ducks/cache";
import { historyV2Selector } from "popup/ducks/remoteConfig";
import { mapV2Page } from "popup/helpers/history/mapPage";
import { HISTORY_V2_PAGE_SIZE } from "popup/views/AccountHistory/hooks/useGetHistoryDataV2";
import { HistoryEntry } from "popup/views/AccountHistory/model";
import { AppDispatch } from "popup/App";

interface ResolvedAccountHistoryData {
  type: AppDataType.RESOLVED;
  /** v1 (flag off, or a network the v2 backend can't serve): per-asset op rows */
  operationsByAsset: AssetOperations | null;
  /** v2: the mapped first page of entries; AssetDetail filters them per asset */
  historyEntries: HistoryEntry[] | null;
}

export type AccountHistoryData = NeedsReRoute | ResolvedAccountHistoryData;

function useGetAccountHistoryData() {
  const [state, dispatch] = useReducer(
    reducer<AccountHistoryData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchHistory } = useGetHistory();
  const { fetchData: fetchTokenDetails } = useTokenDetails();
  const homeDomains = useSelector(homeDomainsSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);
  const useHistoryV2 = useSelector(historyV2Selector);
  const reduxDispatch = useDispatch<AppDispatch>();
  const fetchData = async ({ balances }: { balances: AccountBalances }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData(true);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;

      // Same gate as the History view's router: the flag turns v2 on, and
      // networks the v2 backend can't serve (custom networks, Futurenet)
      // stay on v1 regardless. The home screen must never fetch v1 history
      // while the rest of the app is on v2 — the per-asset lists would
      // disagree with the History view about the same transactions.
      if (useHistoryV2 && isHistoryV2Servable(networkDetails)) {
        const page = await getAccountHistoryV2(publicKey, networkDetails, {
          limit: HISTORY_V2_PAGE_SIZE,
        });
        const entries = await mapV2Page({
          transactions: page.data,
          publicKey,
          networkDetails,
          balances,
          assetsListsData: cachedTokenLists,
        });

        const v2Payload = {
          type: AppDataType.RESOLVED,
          operationsByAsset: null,
          historyEntries: entries,
        } as ResolvedAccountHistoryData;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: v2Payload });
        return v2Payload;
      }

      const history = await fetchHistory(publicKey, networkDetails);

      if (isError<HistoryResponse>(history)) {
        throw new Error(history.message);
      }

      const cachedIcons = { ...(balances.icons || {}) };
      const cachedHomeDomains = {
        ...(homeDomains[networkDetails.network] || {}),
      };

      const payload = {
        type: AppDataType.RESOLVED,
        historyEntries: null,
        operationsByAsset: await sortOperationsByAsset({
          balances: balances.balances,
          operations: history,
          networkDetails: networkDetails,
          publicKey,
          fetchTokenDetails,
          icons: cachedIcons,
          homeDomains: cachedHomeDomains,
          cachedTokenLists,
        }),
      } as ResolvedAccountHistoryData;

      // If we found new home domains and icons during iteration, save them to the cache

      reduxDispatch(saveIconsForBalances({ icons: cachedIcons }));
      reduxDispatch(
        saveDomainForIssuer({ networkDetails, homeDomains: cachedHomeDomains }),
      );

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetAccountHistoryData, RequestState };
