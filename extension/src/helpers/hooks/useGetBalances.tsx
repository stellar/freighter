import { useReducer } from "react";

import {
  getAccountBalances,
  getAssetIcons,
  getHiddenAssets,
} from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetIcons, SoroswapToken } from "@shared/api/types";
import {
  AccountBalancesInterface,
  BalanceMap,
} from "@shared/api/types/backend-api";
import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { storeBalanceMetricData } from "helpers/metrics";
import { filterHiddenBalances, sortBalances } from "popup/helpers/account";
import { AssetType } from "@shared/api/types/account-balance";
import { useIsSoroswapEnabled } from "popup/helpers/useIsSwap";
import { useGetSoroswapTokens } from "./useGetSoroswapTokens";

export interface AccountBalances {
  balances: AssetType[];
  soroswapTokens: SoroswapToken[];
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
  const isSoroswapSupported = useIsSoroswapEnabled();
  const [state, dispatch] = useReducer(
    reducer<AccountBalances, unknown>,
    initialState,
  );

  const { fetchData: getTokens } = useGetSoroswapTokens();

  const fetchData = async (): Promise<AccountBalances | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const data = await getAccountBalances(
        publicKey,
        networkDetails,
        options.isMainnet,
      );
      const soroswapTokens = isSoroswapSupported
        ? await getTokens()
        : { assets: [] };
      if (isError<{ assets: SoroswapToken[] }>(soroswapTokens)) {
        throw new Error(soroswapTokens.message);
      }

      const payload = {
        isFunded: data.isFunded,
        subentryCount: data.subentryCount,
        error: data.error,
        soroswapTokens: soroswapTokens.assets,
      } as AccountBalances;

      if (!options.showHidden) {
        const hiddenAssets = await getHiddenAssets({
          activePublicKey: publicKey,
        });
        payload.balances = sortBalances(
          filterHiddenBalances(
            data.balances as NonNullable<BalanceMap>,
            hiddenAssets.hiddenAssets,
          ),
        );
      } else {
        payload.balances = sortBalances(data.balances);
      }

      if (options.includeIcons) {
        const icons = await getAssetIcons({
          balances: data.balances,
          networkDetails,
        });
        payload.icons = icons;
      }
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      storeBalanceMetricData(publicKey, data.isFunded || false);
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch balances", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetBalances, RequestState };
