import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, isError, reducer } from "helpers/request";

import { isMainnet } from "helpers/stellar";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { getTokenPrices } from "popup/views/Account/hooks/useGetAccountData";
import { ApiTokenPrices } from "@shared/api/types";

export interface ResolvedSwapFrom {
  type: AppDataType.RESOLVED;
  publicKey: string;
  balances: AccountBalances;
  filteredBalances: AccountBalances["balances"];
  networkDetails: NetworkDetails;
  applicationState: APPLICATION_STATE;
  tokenPrices: ApiTokenPrices;
}

export type SwapFrom = NeedsReRoute | ResolvedSwapFrom;

export function useGetSwapFromData(getBalancesOptions: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<SwapFrom, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(getBalancesOptions);

  const fetchData = async (useCache = false): Promise<SwapFrom | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData(useCache);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const balances = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
        useCache,
      );

      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }

      const tokenPrices = await getTokenPrices({ balances: balances.balances });

      const payload = {
        type: AppDataType.RESOLVED,
        balances,
        filteredBalances: balances.balances,
        publicKey,
        networkDetails,
        tokenPrices,
        applicationState: appData.account.applicationState,
      } as SwapFrom;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch data", { cause: error });
    }
  };

  const filterBalances = (searchTerm: string) => {
    const resolvedSwapData = state.data as ResolvedSwapFrom;
    const term = searchTerm.toLowerCase();

    if (!term) {
      const payload = {
        ...resolvedSwapData,
        filteredBalances: resolvedSwapData?.balances.balances || [],
      } as SwapFrom;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return;
    }

    const balances = resolvedSwapData?.balances.balances || [];
    const filtered =
      term?.length > 2
        ? balances.filter((balance) => {
            if (
              "token" in balance &&
              balance.token.code.toLowerCase().includes(term)
            )
              return true;
            if (
              "token" in balance &&
              "issuer" in balance.token &&
              balance.token.issuer.key.toLowerCase().includes(term)
            )
              return true;
            if (
              "contractId" in balance &&
              balance.contractId.toLowerCase().includes(term)
            )
              return true;
            return false;
          })
        : balances;
    const payload = {
      ...resolvedSwapData,
      filteredBalances: filtered,
    } as SwapFrom;
    dispatch({ type: "FETCH_DATA_SUCCESS", payload });
  };

  return {
    state,
    fetchData,
    filterBalances,
  };
}
