import { useReducer } from "react";

import { getAccountHistory } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { ServerApi } from "stellar-sdk/lib/horizon";
import { initialState, reducer } from "helpers/request";

export type HistoryResponse = ServerApi.OperationRecord[];

function useGetHistory(publicKey: string, networkDetails: NetworkDetails) {
  const [state, dispatch] = useReducer(
    reducer<HistoryResponse, unknown>,
    initialState,
  );

  const fetchData = async (): Promise<HistoryResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getAccountHistory(publicKey, networkDetails);
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      return data;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch history", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetHistory };
