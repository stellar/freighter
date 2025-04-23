import { useReducer } from "react";

import { RequestState } from "../../../../../constants/request";
import { initialState, isError, reducer } from "../../../../../helpers/request";
import { useGetAppData } from "../../../../../helpers/hooks/useGetAppData";
import {
  AccountBalances,
  useGetBalances,
} from "../../../../../helpers/hooks/useGetBalances";
import { isMainnet, isTestnet } from "../../../../../helpers/stellar";
import { NetworkDetails } from "@shared/constants/stellar";

export interface SearchData {
  publicKey: string;
  networkDetails: NetworkDetails;
  balances: AccountBalances;
  isAllowListVerificationEnabled: boolean;
}

function useGetSearchData(options: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<SearchData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(options);

  const fetchData = async (): Promise<SearchData | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const isAllowListVerificationEnabled =
        isMainnet(networkDetails) || isTestnet(networkDetails);
      const balances = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
      );

      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }

      const payload = {
        balances,
        publicKey,
        isAllowListVerificationEnabled,
        networkDetails: appData.settings.networkDetails,
      } as SearchData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch search data", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetSearchData, RequestState };
