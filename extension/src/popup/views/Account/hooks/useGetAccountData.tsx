import { useReducer } from "react";
import { ServerApi } from "stellar-sdk/lib/horizon";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useGetHistory } from "helpers/hooks/useGetHistory";

interface AccountData {
  balances: AccountBalances;
  history: ServerApi.OperationRecord[];
}

function useGetAccountData(
  publicKey: string,
  networkDetails: NetworkDetails,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<AccountData, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    options,
  );
  const { fetchData: fetchHistory } = useGetHistory(publicKey, networkDetails);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balancesResult = await fetchBalances();
      const history = await fetchHistory();

      // TODO: make type narrow functions
      if (!("balances" in balancesResult)) {
        throw new Error(balancesResult.message);
      }

      const payload = { balances: balancesResult, history };
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

export { useGetAccountData, RequestState };
