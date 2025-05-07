import { useReducer } from "react";

import { initialState, isError, reducer } from "../../../../helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "../../../../helpers/hooks/useGetAppData";
import { useScanSite } from "../../../../popup/helpers/blockaid";
import { BlockAidScanSiteResult } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

type ResolvedGrantAccessData = BlockAidScanSiteResult & {
  type: AppDataType.RESOLVED;
  publicKey: string;
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
  applicationState: APPLICATION_STATE;
};

type GrantAccessData = NeedsReRoute | ResolvedGrantAccessData;

function useGetGrantAccessData(url: string) {
  const [state, dispatch] = useReducer(
    reducer<GrantAccessData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { scanSite } = useScanSite();

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

      const scanData = await scanSite(url, appData.settings.networkDetails);

      if (!scanData) {
        throw new Error("Unable to scan site");
      }

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey: appData.account.publicKey,
        networkDetails: appData.settings.networkDetails,
        applicationState: appData.account.applicationState,
        networksList: appData.settings.networksList,
        ...scanData,
      } as ResolvedGrantAccessData;

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

export { useGetGrantAccessData };
