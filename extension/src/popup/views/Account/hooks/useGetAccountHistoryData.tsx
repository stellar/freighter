import { useReducer } from "react";

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

interface ResolvedAccountHistoryData {
  type: AppDataType.RESOLVED;
  operationsByAsset: AssetOperations;
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

      // // take this out; for testing only
      // const delay = () =>
      //   new Promise((resolve) => {
      //     setTimeout(() => {
      //       resolve(true);
      //     }, 5000);
      //   });
      // await delay();

      const history = await fetchHistory(publicKey, networkDetails);

      if (isError<HistoryResponse>(history)) {
        throw new Error(history.message);
      }

      const payload = {
        type: AppDataType.RESOLVED,
        operationsByAsset: sortOperationsByAsset({
          balances: balances.balances,
          operations: history,
          networkDetails: networkDetails,
          publicKey,
          fetchTokenDetails,
        }),
      } as ResolvedAccountHistoryData;

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
