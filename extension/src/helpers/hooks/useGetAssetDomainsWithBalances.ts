import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { Balance, SoroswapToken } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";

import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { getCanonicalFromAsset } from "helpers/stellar";
import { findAssetBalance } from "popup/helpers/balance";
import { isAssetSuspicious } from "../../popup/helpers/blockaid";
import { getNativeContractDetails } from "../../popup/helpers/searchAsset";
import { useIsSoroswapEnabled, useIsSwap } from "../../popup/helpers/useIsSwap";
import { getAssetDomain } from "../../popup/helpers/getAssetDomain";
import { AccountBalances, useGetBalances } from "./useGetBalances";
import { useGetSoroswapTokens } from "./useGetSoroswapTokens";

export interface AssetDomains {
  balances: AccountBalances;
  soroswapTokens: SoroswapToken[];
  domains: ManageAssetCurrency[];
  isManagingAssets: boolean;
}

export function useGetAssetDomainsWithBalances(
  publicKey: string,
  networkDetails: NetworkDetails,
  isSource: boolean,
  isManagingAssets: boolean,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const isSwap = useIsSwap();
  const isSoroswapEnabled = useIsSoroswapEnabled();

  const [state, dispatch] = useReducer(
    reducer<AssetDomains, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    options,
  );
  const { fetchData: getTokens } = useGetSoroswapTokens();

  const fetchData = async (): Promise<AssetDomains | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balances = await fetchBalances();
      const soroswapTokens = isSoroswapEnabled
        ? await getTokens()
        : { assets: [] };

      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }

      if (isError<{ assets: SoroswapToken[] }>(soroswapTokens)) {
        throw new Error(soroswapTokens.message);
      }

      const domains = [] as ManageAssetCurrency[];
      // TODO: cache home domain when getting asset icon
      // https://github.com/stellar/freighter/issues/410
      for (let i = 0; i < balances.balances.length; i += 1) {
        const balance = balances.balances[i];
        if ("liquidityPoolId" in balance && balance.liquidityPoolId) {
          continue;
        }

        const { token, contractId, blockaidData } = balance as Balance;

        const code = token.code || "";
        let issuer = {
          key: "",
        };

        if ("issuer" in token) {
          issuer = token.issuer;
        }

        // If we are in the swap flow and the asset has decimals (is a token), we skip it if Soroswap is not enabled
        if (
          "decimals" in balances.balances[i] &&
          isSwap &&
          !isSoroswapEnabled
        ) {
          continue;
        }

        if (code !== "XLM") {
          let domain = "";

          if (issuer.key) {
            try {
              domain = await getAssetDomain(
                issuer.key,
                networkDetails.networkUrl,
                networkDetails.networkPassphrase,
              );
            } catch (e) {
              console.error(e);
            }
          }

          const icons = balances.icons || {};
          domains.push({
            code,
            issuer: issuer.key,
            image: icons[getCanonicalFromAsset(code, issuer.key)],
            domain,
            contract: contractId,
            isSuspicious: isAssetSuspicious(blockaidData),
          });
          // include native asset for asset dropdown selection
        } else if (!isManagingAssets) {
          domains.push({
            code,
            issuer: "",
            image: "",
            domain: "",
            isSuspicious: false,
          });
        }
      }

      if (isSoroswapEnabled && isSwap && !isSource) {
        soroswapTokens.assets.forEach((token) => {
          const nativeContractDetails =
            getNativeContractDetails(networkDetails);

          // if we have a balance for a token, it will have been handled above.
          // This is designed to populate tokens available from Soroswap that the user does not already have
          if (
            balances &&
            !findAssetBalance(balances.balances, {
              code: token.code,
              issuer: token.contract,
            }) &&
            token.contract !== nativeContractDetails.contract
          ) {
            domains.push({
              code: token.code,
              issuer: token.contract,
              image: token.icon,
              domain: "",
              icon: token.icon,
            });
          }
        });
      }

      const payload = {
        domains,
        isManagingAssets,
        balances,
        soroswapTokens: soroswapTokens.assets,
      };
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch domains", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}
