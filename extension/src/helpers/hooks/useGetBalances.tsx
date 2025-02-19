import { useReducer } from "react";

import { getAccountBalances, getHiddenAssets } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { AccountBalancesInterface, BalanceMap } from "@shared/api/types";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { storeBalanceMetricData } from "helpers/metrics";
import { filterHiddenBalances } from "popup/helpers/account";

function useGetBalances(
  publicKey: string,
  networkDetails: NetworkDetails,
  isMainnet: boolean,
  showHidden: boolean,
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
      storeBalanceMetricData(publicKey, data.isFunded || false);
      if (!showHidden) {
        const hiddenAssets = await getHiddenAssets();
        return {
          ...data,
          balances: filterHiddenBalances(
            data.balances as NonNullable<BalanceMap>,
            hiddenAssets.hiddenAssets,
          ),
        } as AccountBalancesInterface;
      }
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
