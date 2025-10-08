import { useReducer } from "react";
import { captureException } from "@sentry/browser";
import { useDispatch } from "react-redux";

import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { AppDataType, NeedsReRoute } from "helpers/hooks/useGetAppData";
import { loadAccount } from "@shared/api/internal";
import { AppDispatch } from "popup/App";
import { saveAccount } from "popup/ducks/accountServices";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { POPUP_WIDTH } from "constants/dimensions";

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
