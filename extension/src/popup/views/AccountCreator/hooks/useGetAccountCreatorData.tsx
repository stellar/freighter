import { useReducer } from "react";

import { initialState, isError, reducer } from "../../../../helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "../../../../helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

interface ResolvedAccountData {
  type: AppDataType.RESOLVED;
  networkDetails?: NetworkDetails;
  publicKey?: string;
  applicationState: APPLICATION_STATE;
}

type AccountData = NeedsReRoute | ResolvedAccountData;

function useGetAccountCreatorData() {
  const [state, dispatch] = useReducer(
    reducer<AccountData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      const publicKey =
        appData.type === AppDataType.REROUTE ? "" : appData.account.publicKey;
      const networkDetails =
        appData.type === AppDataType.REROUTE
          ? ""
          : appData.settings.networkDetails;

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        applicationState:
          appData.type === AppDataType.REROUTE
            ? APPLICATION_STATE.APPLICATION_STARTED
            : appData.account.applicationState,
        networkDetails,
      } as ResolvedAccountData;

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
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

export { useGetAccountCreatorData };
