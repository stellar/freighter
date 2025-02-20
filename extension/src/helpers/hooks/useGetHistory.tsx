import { useReducer } from "react";

import { getAccountHistory } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { ServerApi } from "stellar-sdk/lib/horizon";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";

function useGetHistory(publicKey: string, networkDetails: NetworkDetails) {
  const [state, dispatch] = useReducer(
    reducer<ServerApi.OperationRecord[], unknown>,
    initialState,
  );

  const fetchData = async (): Promise<ServerApi.OperationRecord[]> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getAccountHistory(publicKey, networkDetails);
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      return data;
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

export { useGetHistory, RequestState };
