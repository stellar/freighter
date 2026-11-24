import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, isError, reducer } from "helpers/request";

import { isMainnet } from "helpers/stellar";
import { matchesSwapFromSearch } from "./matchesSwapFromSearch";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useGetTokenPrices } from "helpers/hooks/useGetTokenPrices";
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

// Filter from the first character (token codes can be 1-2 letters), matching
// the destination ("Swap to") search. matchesSwapFromSearch also resolves a
// pasted SAC to the held token it wraps -- derived from the asset, no extra
// API call.
const filterSwapFromBalances = (
  balances: AccountBalances["balances"],
  searchTerm: string,
  networkDetails: NetworkDetails,
) =>
  searchTerm
    ? balances.filter((balance) =>
        matchesSwapFromSearch({ balance, searchTerm, networkDetails }),
      )
    : balances;

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
  const { fetchData: fetchTokenPrices } = useGetTokenPrices();

  /** `searchTerm` keeps a typed search applied across a reload. */
  const fetchData = async (
    useCache = false,
    searchTerm = "",
  ): Promise<SwapFrom | Error> => {
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

      const fetchedTokenPrices = await fetchTokenPrices({
        publicKey,
        balances: balances.balances,
        networkDetails,
        useCache: true,
      });

      const payload = {
        type: AppDataType.RESOLVED,
        balances,
        filteredBalances: filterSwapFromBalances(
          balances.balances,
          searchTerm,
          networkDetails,
        ),
        publicKey,
        networkDetails,
        // The price fetch reports failure with null; the field is declared
        // non-null, so normalize here rather than leaking it downstream.
        tokenPrices: fetchedTokenPrices.tokenPrices || {},
        applicationState: appData.account.applicationState,
      } as SwapFrom;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error(`Failed to fetch data - ${error}`);
    }
  };

  const filterBalances = (searchTerm: string) => {
    const resolvedSwapData = state.data as ResolvedSwapFrom;
    const payload = {
      ...resolvedSwapData,
      filteredBalances: filterSwapFromBalances(
        resolvedSwapData?.balances.balances || [],
        searchTerm,
        resolvedSwapData?.networkDetails,
      ),
    } as SwapFrom;
    dispatch({ type: "FETCH_DATA_SUCCESS", payload });
  };

  return {
    state,
    fetchData,
    filterBalances,
  };
}
