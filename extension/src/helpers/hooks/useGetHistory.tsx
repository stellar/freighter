import { useReducer } from "react";

import { getAccountHistory } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
// eslint-disable-next-line import/no-unresolved
import { ServerApi } from "stellar-sdk/lib/horizon";

import { RequestState, initialState, reducer } from "./fetchHookInterface";

type SuccessReturnType = ServerApi.OperationRecord[];

function useGetHistory(publicKey: string, networkDetails: NetworkDetails) {
  const [state, dispatch] = useReducer(
    reducer<SuccessReturnType>,
    initialState,
  );

  const fetchData = async () => {
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
