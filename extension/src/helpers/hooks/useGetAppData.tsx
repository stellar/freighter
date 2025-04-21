import { useReducer } from "react";
import { useDispatch } from "react-redux";

import { initialState, reducer } from "helpers/request";
import { storeAccountMetricsData } from "helpers/metrics";
import { loadAccount, loadSettings } from "@shared/api/internal";
import { saveAccount, saveAccountError } from "popup/ducks/accountServices";
import { saveSettingsAction } from "popup/ducks/settings";

export interface AppData {
  account: Awaited<ReturnType<typeof loadAccount>>;
  settings: Awaited<ReturnType<typeof loadSettings>>;
}

function useGetAppData() {
  const [state, dispatch] = useReducer(reducer<AppData, unknown>, initialState);
  const reduxDispatch = useDispatch();

  const fetchData = async (): Promise<AppData | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const account = await loadAccount();
      const settings = await loadSettings();

      storeAccountMetricsData(account.publicKey, account.allAccounts);
      reduxDispatch(saveAccount(account));
      reduxDispatch(saveSettingsAction(settings));
      const payload = {
        account,
        settings,
      };
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      reduxDispatch(saveAccountError(error));
      throw new Error("Failed to fetch app data", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetAppData };
