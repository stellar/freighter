import { useReducer } from "react";

import {
  getAccountBalances,
  getAssetIcons,
  getHiddenAssets,
} from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  AccountBalancesInterface,
  AssetIcons,
  AssetType,
  BalanceMap,
} from "@shared/api/types";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { storeBalanceMetricData } from "helpers/metrics";
import { filterHiddenBalances, sortBalances } from "popup/helpers/account";

export interface AccountBalances {
  balances: AssetType[];
  isFunded: AccountBalancesInterface["isFunded"];
  subentryCount: AccountBalancesInterface["subentryCount"];
  error?: AccountBalancesInterface["error"];
  icons?: AssetIcons;
}

function useGetBalances(
  publicKey: string,
  networkDetails: NetworkDetails,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const [state, dispatch] = useReducer(
    reducer<AccountBalances, unknown>,
    initialState,
  );

  const fetchData = async (): Promise<AccountBalances | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getAccountBalances(
        publicKey,
        networkDetails,
        options.isMainnet,
      );

      if (!options.showHidden) {
        const hiddenAssets = await getHiddenAssets();
        return {
          ...data,
          balances: sortBalances(
            filterHiddenBalances(
              data.balances as NonNullable<BalanceMap>,
              hiddenAssets.hiddenAssets,
            ),
          ),
        } as AccountBalances;
      }

      if (options.includeIcons) {
        const icons = await getAssetIcons({
          balances: data.balances,
          networkDetails,
        });
        return {
          ...data,
          balances: sortBalances(data.balances),
          icons,
        } as AccountBalances;
      }

      const accountBalances = {
        ...data,
        balances: sortBalances(data.balances),
      };
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: accountBalances });
      storeBalanceMetricData(publicKey, data.isFunded || false);
      return accountBalances;
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

export { useGetBalances, RequestState };
