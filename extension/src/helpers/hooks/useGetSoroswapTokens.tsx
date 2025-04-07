import { useReducer } from "react";

import { initialState, reducer } from "helpers/request";
import { getSoroswapTokens } from "popup/helpers/sorobanSwap";

export type SoroswapTokensResponse = Awaited<
  ReturnType<typeof getSoroswapTokens>
>;

function useGetSoroswapTokens() {
  const [state, dispatch] = useReducer(
    reducer<SoroswapTokensResponse, unknown>,
    initialState,
  );

  const fetchData = async (): Promise<SoroswapTokensResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getSoroswapTokens();
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
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

export { useGetSoroswapTokens };
