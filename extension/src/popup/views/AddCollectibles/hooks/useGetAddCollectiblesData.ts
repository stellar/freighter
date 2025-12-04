import { useReducer } from "react";
import { RequestState } from "constants/request";
import { reducer, initialState, isError } from "helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

interface ResolvedAddCollectiblesData {
  type: AppDataType.RESOLVED;
  publicKey: string;
  networkDetails: NetworkDetails;
  applicationState: APPLICATION_STATE;
}

type AddCollectiblesData = NeedsReRoute | ResolvedAddCollectiblesData;

function useGetAddCollectiblesData({
  useAppDataCache = true,
}: {
  useAppDataCache?: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<AddCollectiblesData, unknown>,
    initialState,
  );

  const { fetchData: fetchAppData } = useGetAppData();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    const appData = await fetchAppData(useAppDataCache, false);
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
    } as ResolvedAddCollectiblesData;

    dispatch({ type: "FETCH_DATA_SUCCESS", payload });
    return payload;
  };
  return {
    state,
    fetchData,
  };
}

export { useGetAddCollectiblesData, RequestState };
