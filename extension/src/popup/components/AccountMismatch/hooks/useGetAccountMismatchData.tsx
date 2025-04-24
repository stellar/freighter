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
  networkDetails: NetworkDetails;
  publicKey: string;
  applicationState: APPLICATION_STATE;
}

type AccountData = NeedsReRoute | ResolvedAccountData;

function useGetAccountMismatchData() {
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

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        applicationState: appData.account.applicationState,
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

export { useGetAccountMismatchData };
