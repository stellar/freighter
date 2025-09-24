import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { tokenDetailsSelector, saveTokenDetails } from "popup/ducks/cache";
import { getTokenDetails } from "@shared/api/internal";
import { initialState, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";

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
      const cachedTokenDetailsData = cachedTokenDetails[contractId];
      const data =
        useCache && cachedTokenDetailsData
          ? cachedTokenDetailsData
          : await getTokenDetails({ contractId, publicKey, networkDetails });
      if (data) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
        reduxDispatch(saveTokenDetails({ contractId, ...data }));
        return data;
      }
      return null;
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
