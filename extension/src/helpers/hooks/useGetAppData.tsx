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
import { ROUTES } from "popup/constants/routes";
import { POPUP_WIDTH } from "constants/dimensions";

export enum AppDataType {
  REROUTE = "re-route",
  RESOLVED = "resolved",
}
export interface NeedsReRoute {
  type: AppDataType.REROUTE;
  routeTarget: ROUTES.unlockAccount | ROUTES.accountCreator;
  shouldOpenTab: boolean;
}

interface ResolvedData {
  type: AppDataType.RESOLVED;
  account: Awaited<ReturnType<typeof loadAccount>>;
  settings: Awaited<ReturnType<typeof loadSettings>>;
}

export type AppData = NeedsReRoute | ResolvedData;

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

      if (
        !account.publicKey ||
        account.applicationState === APPLICATION_STATE.APPLICATION_STARTED
      ) {
        const hasOnboarded =
          account.applicationState ===
          APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;
        const payload = {
          type: "re-route",
          routeTarget: hasOnboarded ? ROUTES.unlockAccount : ROUTES.welcome,
          shouldOpenTab: window.innerWidth === POPUP_WIDTH && !hasOnboarded,
        } as NeedsReRoute;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        return payload;
      }

      const payload = {
        type: "resolved",
        account,
        settings,
      } as ResolvedData;
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
