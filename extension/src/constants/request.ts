export enum RequestState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface SuccessState<T> {
  state: RequestState.SUCCESS;
  data: T;
  error: null;
}

export interface ErrorState<T> {
  state: RequestState.ERROR;
  data: null;
  error: T;
}

export interface IdleState {
  state: RequestState.IDLE;
  data: null;
  error: null;
}

export interface LoadingState {
  state: RequestState.LOADING;
  data: null;
  error: null;
}

export type State<T, K> =
  | IdleState
  | LoadingState
  | SuccessState<T>
  | ErrorState<K>;

export type Action<T, K> =
  | { type: "FETCH_DATA_START" }
  | { type: "FETCH_DATA_SUCCESS"; payload: SuccessState<T>["data"] }
  | { type: "FETCH_DATA_ERROR"; payload: ErrorState<K>["error"] };
