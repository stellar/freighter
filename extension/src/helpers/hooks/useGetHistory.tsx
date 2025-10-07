import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { historySelector, saveHistoryForAccount } from "popup/ducks/cache";
import { getAccountHistory } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, reducer } from "helpers/request";
import { HorizonOperation } from "@shared/api/types";
import { AppDispatch } from "popup/App";

export type HistoryResponse = HorizonOperation[];

function useGetHistory() {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<HistoryResponse, unknown>,
    initialState,
  );
  const cachedHistory = useSelector(historySelector);

  const fetchData = async (
    publicKey: string,
    networkDetails: NetworkDetails,
    useCache = false,
  ): Promise<HistoryResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const cachedHistoryData =
        cachedHistory[networkDetails.network]?.[publicKey];
      const data =
        useCache && cachedHistoryData
          ? cachedHistoryData
          : await getAccountHistory(publicKey, networkDetails);
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      reduxDispatch(
        saveHistoryForAccount({ publicKey, history: data, networkDetails }),
      );
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
