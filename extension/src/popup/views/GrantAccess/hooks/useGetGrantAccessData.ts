import { useReducer } from "react";
import { useSelector } from "react-redux";

import { initialState, isError, reducer } from "../../../../helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "../../../../helpers/hooks/useGetAppData";
import { useAsyncSiteScan } from "../../../../popup/helpers/blockaid";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { BlockAidScanSiteResult } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

type ResolvedGrantAccessData = {
  type: AppDataType.RESOLVED;
  publicKey: string;
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
  applicationState: APPLICATION_STATE;
  scanData: BlockAidScanSiteResult | null | undefined;
};

type GrantAccessData = NeedsReRoute | ResolvedGrantAccessData;

function useGetGrantAccessData(url: string) {
  const [state, dispatch] = useReducer(
    reducer<GrantAccessData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { scanSite } = useAsyncSiteScan<GrantAccessData>(
    url,
    networkDetails.networkPassphrase,
    dispatch,
    (payload, scanData) => ({ ...payload, scanData }),
  );

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

      // Initial payload without scanData to avoid blocking UI
      const initialPayload = {
        type: AppDataType.RESOLVED,
        publicKey: appData.account.publicKey,
        networkDetails: appData.settings.networkDetails,
        applicationState: appData.account.applicationState,
        networksList: appData.settings.networksList,
        scanData: undefined,
      } as ResolvedGrantAccessData;

      dispatch({ type: "FETCH_DATA_SUCCESS", payload: initialPayload });

      // Fetch scan data asynchronously without blocking UI
      scanSite(initialPayload);

      return initialPayload;
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
