import { Action, IdleState, RequestState, State } from "constants/request";

export const isError = <T>(response: T | Error): response is Error => {
  if (response instanceof Error) {
    return true;
  }
  return false;
};

export const initialState: IdleState = {
  state: RequestState.IDLE,
  data: null,
  error: null,
};

export const reducer = <T, K>(
  state: State<T, K>,
  action: Action<T, K>,
): State<T, K> => {
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

export const isCacheValid = (cachedData: { updatedAt: number }) => {
  return cachedData && cachedData.updatedAt > Date.now() - 180000; // 3 minutes;
};
