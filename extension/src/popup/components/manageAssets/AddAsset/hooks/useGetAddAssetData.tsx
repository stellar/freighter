import { useReducer } from "react";

import { RequestState } from "../../../../../constants/request";
import { initialState, isError, reducer } from "../../../../../helpers/request";
import {
  AccountBalances,
  useGetBalances,
} from "../../../../../helpers/hooks/useGetBalances";
import { isMainnet, isTestnet } from "../../../../../helpers/stellar";
import { useGetAppData } from "../../../../../helpers/hooks/useGetAppData";
import { NetworkDetails } from "@shared/constants/stellar";

interface AddAssetData {
  balances: AccountBalances;
  networkDetails: NetworkDetails;
  publicKey: string;
  isAllowListVerificationEnabled: boolean;
}

function useGetAddAssetData(options: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<AddAssetData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(options);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const balances = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
      );
      const isAllowListVerificationEnabled =
        isMainnet(networkDetails) || isTestnet(networkDetails);

      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }

      const payload = {
        publicKey,
        balances,
        networkDetails,
        isAllowListVerificationEnabled,
      } as AddAssetData;

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

export { useGetAddAssetData, RequestState };
