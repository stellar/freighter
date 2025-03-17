import { useReducer } from "react";
import { Asset } from "stellar-sdk";

import {
  getAccountBalances,
  getAssetIcons,
  getHiddenAssets,
} from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  AccountBalancesInterface,
  AssetIcons,
  BalanceMap,
} from "@shared/api/types";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { storeBalanceMetricData } from "helpers/metrics";
import { filterHiddenBalances, sortBalances } from "popup/helpers/account";
import { isAsset } from "helpers/stellar";
import {
  AssetType,
  LiquidityPoolShareAsset,
  SorobanAsset,
} from "@shared/api/types/account-balance";

export const isGetBalancesError = (
  response: AccountBalances | Error,
): response is Error => {
  if (!("balances" in response)) {
    return true;
  }
  return false;
};

export const findAssetBalance = (
  balances: AssetType[],
  asset: Asset | { issuer: string; code: string },
) => {
  if (isAsset(asset) && asset.isNative()) {
    return balances.find(
      (balance) =>
        "token" in balance &&
        "type" in balance.token &&
        balance.token.type === "native",
    ) as Exclude<AssetType, SorobanAsset | LiquidityPoolShareAsset>;
  }
  return balances.find((balance) => {
    const balanceIssuer =
      "token" in balance && "issuer" in balance.token
        ? balance.token.issuer.key
        : "";
    return balanceIssuer === asset.issuer;
  }) as Exclude<AssetType, SorobanAsset | LiquidityPoolShareAsset>;
};

export const findAddressBalance = (balances: AssetType[], address: string) => {
  if (address === "native") {
    return balances.find(
      (balance) =>
        "token" in balance &&
        "type" in balance.token &&
        balance.token.type === "native",
    );
  }
  return balances.find((balance) => {
    const balanceIssuer =
      "token" in balance && "issuer" in balance.token
        ? balance.token.issuer.key
        : "";
    return balanceIssuer === address;
  });
};

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

      const payload = {
        isFunded: data.isFunded,
        subentryCount: data.subentryCount,
        error: data.error,
      } as AccountBalances;

      if (!options.showHidden) {
        const hiddenAssets = await getHiddenAssets();
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
      return new Error(JSON.stringify(error));
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetBalances, RequestState };
