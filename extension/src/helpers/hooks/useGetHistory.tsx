import { useReducer } from "react";

import { getAccountHistory } from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { ServerApi } from "stellar-sdk/lib/horizon";

enum RequestState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

interface SuccessState {
  state: RequestState.SUCCESS;
  data: ServerApi.OperationRecord[];
  error: null;
}

interface ErrorState {
  state: RequestState.ERROR;
  data: null;
  error: unknown;
}

interface IdleState {
  state: RequestState.IDLE;
  data: null;
  error: null;
}

interface LoadingState {
  state: RequestState.LOADING;
  data: null;
  error: null;
}

type State = IdleState | LoadingState | SuccessState | ErrorState;

type Action =
  | { type: "FETCH_DATA_START" }
  | { type: "FETCH_DATA_SUCCESS"; payload: SuccessState["data"] }
  | { type: "FETCH_DATA_ERROR"; payload: ErrorState["error"] };

const initialState: IdleState = {
  state: RequestState.IDLE,
  data: null,
  error: null,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "FETCH_DATA_START":
      return { state: RequestState.LOADING, error: null, data: null };
    case "FETCH_DATA_SUCCESS":
      return { error: null, state: RequestState.SUCCESS, data: action.payload };
    case "FETCH_DATA_ERROR":
      return { data: null, state: RequestState.ERROR, error: action.payload };
    default:
      return state;
  }
};

function useGetHistory(publicKey: string, networkDetails: NetworkDetails) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getAccountHistory(publicKey, networkDetails);
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

export { useGetHistory, RequestState };
