import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { ApiTokenPrices } from "@shared/api/types";
import { getTokenPrices } from "@shared/api/internal";
import { getCanonicalFromAsset } from "helpers/stellar";
import { isCustomNetwork } from "@shared/helpers/stellar";

interface TokenPrices {
  tokenPrices: ApiTokenPrices;
}

function useGetTokenPrices(
  balances: AccountBalances["balances"],
  networkDetails: NetworkDetails,
) {
  const [state, dispatch] = useReducer(
    reducer<TokenPrices, unknown>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      if (isCustomNetwork(networkDetails)) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: { tokenPrices: {} } });
        return {};
      }
      const assetIds = balances
        .filter((balance) => "token" in balance)
        .map((balance) =>
          getCanonicalFromAsset(
            balance.token.code,
            "issuer" in balance.token ? balance.token.issuer.key : undefined,
          ),
        );
      const tokenPrices = await getTokenPrices(assetIds);

      const payload = {
        tokenPrices,
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

export { useGetTokenPrices, RequestState };
