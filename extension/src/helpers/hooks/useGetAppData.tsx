import { useReducer } from "react";
import { useDispatch } from "react-redux";
import * as Sentry from "@sentry/browser";

import { initialState, reducer } from "../request";
import { storeAccountMetricsData } from "../metrics";
import { loadAccount, loadSettings } from "@shared/api/internal";
import {
  saveAccount,
  saveAccountError,
  saveApplicationState,
} from "../../popup/ducks/accountServices";
import { saveSettingsAction } from "../../popup/ducks/settings";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

export interface AppData {
  account: Awaited<ReturnType<typeof loadAccount>>;
  settings: Awaited<ReturnType<typeof loadSettings>>;
}

function useGetAppData() {
  const [state, dispatch] = useReducer(reducer<AppData, unknown>, initialState);
  const reduxDispatch = useDispatch();

  const fetchData = async (): Promise<AppData | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    reduxDispatch(saveApplicationState(APPLICATION_STATE.APPLICATION_LOADING));
    try {
      const account = await loadAccount();
      const settings = await loadSettings();

      storeAccountMetricsData(account.publicKey, account.allAccounts);
      reduxDispatch(saveAccount(account));
      reduxDispatch(saveSettingsAction(settings));
      reduxDispatch(saveApplicationState(account.applicationState));
      const payload = {
        account,
        settings,
      };
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      reduxDispatch(saveAccountError(error));
      Sentry.captureException(`Error loading app data: ${error}`);
      throw new Error("Failed to fetch app data", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetAppData };
