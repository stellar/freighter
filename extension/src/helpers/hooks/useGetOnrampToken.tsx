import { useReducer } from "react";

import { INDEXER_URL } from "@shared/constants/mercury";
import { RequestState, initialState, reducer } from "./fetchHookInterface";

type SuccessReturnType = { token: string | null; error: string | null };

function useGetOnrampToken(publicKey: string) {
  const [state, dispatch] = useReducer(
    reducer<SuccessReturnType>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: publicKey }),
      };
      const url = `${INDEXER_URL}/onramp/token`;
      const response = await fetch(url, options);
      const { data } = await response.json();

      if (!data.token) {
        dispatch({ type: "FETCH_DATA_ERROR", payload: data.error });
        return data.error;
      }

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

export { useGetOnrampToken, RequestState };
