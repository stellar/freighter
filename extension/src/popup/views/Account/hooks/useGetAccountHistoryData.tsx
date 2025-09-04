import { useReducer } from "react";

import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { HistoryResponse, useGetHistory } from "helpers/hooks/useGetHistory";
import { AssetOperations, sortOperationsByAsset } from "popup/helpers/account";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";

interface ResolvedHistoryData {
  type: AppDataType.RESOLVED;
  publicKey: string;
  networkDetails: NetworkDetails;
  operationsByAsset: AssetOperations;
}

type AccountHistoryData = NeedsReRoute | ResolvedHistoryData;

function useGetAccountHistoryData() {
  const [state, dispatch] = useReducer(
    reducer<AccountHistoryData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchHistory } = useGetHistory();

  const fetchData = async ({
    balances,
  }: {
    balances: AccountBalances["balances"];
  }) => {
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
      const history = await fetchHistory(publicKey, networkDetails);

      if (isError<HistoryResponse>(history)) {
        throw new Error(history.message);
      }

      const payload: ResolvedHistoryData = {
        type: AppDataType.RESOLVED,
        publicKey,
        networkDetails,
        operationsByAsset: sortOperationsByAsset({
          balances,
          operations: history,
          networkDetails: networkDetails,
          publicKey,
        }),
      };

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
