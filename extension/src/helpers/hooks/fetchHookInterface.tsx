export enum RequestState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface SuccessState<SuccessReturnType> {
  state: RequestState.SUCCESS;
  data: SuccessReturnType;
  error: null;
}

export interface ErrorState {
  state: RequestState.ERROR;
  data: null;
  error: unknown;
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

export type State<SuccessReturnType> =
  | IdleState
  | LoadingState
  | SuccessState<SuccessReturnType>
  | ErrorState;

export type Action<SuccessReturnType> =
  | { type: "FETCH_DATA_START" }
  | {
      type: "FETCH_DATA_SUCCESS";
      payload: SuccessState<SuccessReturnType>["data"];
    }
  | { type: "FETCH_DATA_ERROR"; payload: ErrorState["error"] };

export const initialState: IdleState = {
  state: RequestState.IDLE,
  data: null,
  error: null,
};

export function reducer<SuccessReturnType>(
  state: State<SuccessReturnType>,
  action: Action<SuccessReturnType>,
): State<SuccessReturnType> {
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
}
