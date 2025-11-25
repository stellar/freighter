import { useReducer } from "react";
import { captureException } from "@sentry/browser";
import { useDispatch } from "react-redux";

import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { AppDataType, NeedsReRoute } from "helpers/hooks/useGetAppData";
import { loadAccount } from "@shared/api/internal";
import { AppDispatch } from "popup/App";
import { saveAccount } from "popup/ducks/accountServices";

interface ResolvedSubmitAccountData {
  type: AppDataType.RESOLVED;
  hasPrivateKey: boolean;
}

type AccountData = NeedsReRoute | ResolvedSubmitAccountData;

function useGetSubmitAccountData() {
  const reduxDispatch = useDispatch<AppDispatch>();

  const [state, dispatch] = useReducer(
    reducer<AccountData, unknown>,
    initialState,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const account = await loadAccount();
      reduxDispatch(saveAccount(account));

      const payload = {
        type: AppDataType.RESOLVED,
        hasPrivateKey: account.hasPrivateKey,
      } as ResolvedSubmitAccountData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });

      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      captureException(
        `Error loading account data on Submit Transaction - ${error}`,
      );
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetSubmitAccountData, RequestState };
