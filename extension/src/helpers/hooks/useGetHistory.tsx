import { useReducer } from "react";

import { getAccountHistory } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, reducer } from "helpers/request";
import { HorizonOperation } from "@shared/api/types";

export type HistoryResponse = HorizonOperation[];

function useGetHistory() {
  const [state, dispatch] = useReducer(
    reducer<HistoryResponse, unknown>,
    initialState,
  );

  const fetchData = async (
    publicKey: string,
    networkDetails: NetworkDetails,
  ): Promise<HistoryResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getAccountHistory(publicKey, networkDetails);
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      return data;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error(`Failed to fetch history - ${error}`);
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetHistory };
