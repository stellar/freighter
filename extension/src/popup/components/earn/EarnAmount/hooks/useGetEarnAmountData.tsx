import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { ApiTokenPrices } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";
import { isMainnet } from "helpers/stellar";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useGetTokenPrices } from "helpers/hooks/useGetTokenPrices";

export interface ResolvedEarnAmount {
  type: AppDataType.RESOLVED;
  publicKey: string;
  networkDetails: NetworkDetails;
  balances: AccountBalances;
  tokenPrices: ApiTokenPrices;
}

export type EarnAmountData = NeedsReRoute | ResolvedEarnAmount;

/**
 * Balances and prices for the deposit amount screen.
 *
 * Deliberately does NOT refetch the earn catalog — the chosen asset, its rate
 * and the pool were captured when the token was picked and live in redux.
 * Refetching would let the rate shift under a user mid-entry.
 */
export function useGetEarnAmountData() {
  const [state, dispatch] = useReducer(
    reducer<EarnAmountData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: true,
  });
  const { fetchData: fetchTokenPrices } = useGetTokenPrices();

  const fetchData = async (
    useCache = false,
  ): Promise<EarnAmountData | Error> => {
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

      const balances = await fetchBalances(
        publicKey,
        isMainnet(networkDetails),
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
        publicKey,
        networkDetails,
        balances,
        tokenPrices: fetchedTokenPrices.tokenPrices,
      } as EarnAmountData;

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error(`Failed to fetch earn amount data - ${error}`);
    }
  };

  return { state, fetchData };
}
