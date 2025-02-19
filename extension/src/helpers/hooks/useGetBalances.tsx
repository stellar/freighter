import { useReducer } from "react";

import { getAccountBalances } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { AccountBalancesInterface } from "@shared/api/types";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";

function useGetBalances(
  publicKey: string,
  networkDetails: NetworkDetails,
  isMainnet: boolean,
) {
  const [state, dispatch] = useReducer(
    reducer<AccountBalancesInterface, unknown>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getAccountBalances(
        publicKey,
        networkDetails,
        isMainnet,
      );
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

export { useGetBalances, RequestState };
