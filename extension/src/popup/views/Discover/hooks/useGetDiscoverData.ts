import { useReducer } from "react";

import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { getDiscoverData } from "@shared/api/internal";
import { DiscoverData } from "@shared/api/types";

interface DiscoverDataPayload {
  discoverData: DiscoverData;
}

const useGetDiscoverData = () => {
  const [state, dispatch] = useReducer(
    reducer<DiscoverDataPayload, unknown>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const discoverData = await getDiscoverData();

      const payload = {
        discoverData,
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
};

export { useGetDiscoverData, RequestState };
