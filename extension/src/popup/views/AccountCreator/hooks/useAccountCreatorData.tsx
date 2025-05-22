import { useReducer } from "react";
import * as Sentry from "@sentry/browser";

import { loadAccount } from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { initialState, reducer } from "helpers/request";

interface AccountCreatorData {
  applicationState: APPLICATION_STATE;
}

function useGetAccountCreatorData() {
  const [state, dispatch] = useReducer(
    reducer<AccountCreatorData, unknown>,
    initialState,
  );

  const fetchData = async (): Promise<AccountCreatorData | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const { applicationState } = await loadAccount();
      const payload = { applicationState };
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      Sentry.captureException(`Error loading app state: ${error}`);
      throw new Error("Failed to fetch app state", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetAccountCreatorData };
