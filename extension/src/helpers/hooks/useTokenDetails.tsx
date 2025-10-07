import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { tokenDetailsSelector, saveTokenDetails } from "popup/ducks/cache";
import { getTokenDetails } from "@shared/api/internal";
import { initialState, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import { AppDispatch, store } from "popup/App";

export type TokenDetailsResponse = {
  decimals: number;
  symbol: string;
  name: string;
} | null;

function useTokenDetails() {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<TokenDetailsResponse, unknown>,
    initialState,
  );
  const cachedTokenDetails = useSelector(tokenDetailsSelector);

  const fetchData = async ({
    contractId,
    useCache = true,
    publicKey,
    networkDetails,
  }: {
    contractId: string;
    useCache?: boolean;
    publicKey: string;
    networkDetails: NetworkDetails;
  }): Promise<TokenDetailsResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      /*
        Unlike the other cache hooks, this hook may be called multiple times within one render.
        For example, when constructing the history rows, this hook can be called many times as we iterate over the history items. 
        If we have cached token details earlier in the loop, we won't have access to the update redux state until the next render.
        To workaround this, we will also check the redux state manually here rather than waiting for the next render to 
        update the selector hook for us.
      */
      const cachedTokenDetailsData =
        cachedTokenDetails[contractId] ||
        store.getState().cache.tokenDetails[contractId];

      const data =
        useCache && cachedTokenDetailsData
          ? cachedTokenDetailsData
          : await getTokenDetails({ contractId, publicKey, networkDetails });
      if (data && Object.keys(data).length) {
        reduxDispatch(saveTokenDetails({ contractId, ...data }));
      }
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      return data;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch token details", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useTokenDetails };
