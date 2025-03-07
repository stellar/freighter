import { useReducer } from "react";
import { useSelector } from "react-redux";

import { NetworkDetails } from "@shared/constants/stellar";
import { Balance } from "@shared/api/types";
import { initialState, reducer } from "helpers/request";

import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import {
  AssetSelectType,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { getCanonicalFromAsset } from "helpers/stellar";
import { isAssetSuspicious } from "../../popup/helpers/blockaid";
import { getNativeContractDetails } from "../../popup/helpers/searchAsset";
import { useIsSoroswapEnabled, useIsSwap } from "../../popup/helpers/useIsSwap";
import { getAssetDomain } from "../../popup/helpers/getAssetDomain";
import {
  AccountBalances,
  isGetBalancesError,
  useGetBalances,
} from "./useGetBalances";

interface AssetDomains {
  balances: AccountBalances;
  domains: ManageAssetCurrency[];
  isManagingAssets: boolean;
}

export function useGetAssetDomains(
  publicKey: string,
  networkDetails: NetworkDetails,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const isSwap = useIsSwap();
  const isSoroswapEnabled = useIsSoroswapEnabled();
  const { assetSelect, soroswapTokens } = useSelector(
    transactionSubmissionSelector,
  );
  const isManagingAssets = assetSelect.type === AssetSelectType.MANAGE;

  const [state, dispatch] = useReducer(
    reducer<AssetDomains, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances(
    publicKey,
    networkDetails,
    options,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const balances = await fetchBalances();

      if (isGetBalancesError(balances)) {
        throw new Error(balances.message);
      }

      const domains = [] as ManageAssetCurrency[];
      // TODO: cache home domain when getting asset icon
      // https://github.com/stellar/freighter/issues/410
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < balances.balances.length; i += 1) {
        const balance = balances.balances[i];
        if ("liquidityPoolId" in balance && balance.liquidityPoolId) {
          // eslint-disable-next-line
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
          // eslint-disable-next-line
          continue;
        }

        if (code !== "XLM") {
          let domain = "";

          if (issuer.key) {
            try {
              // eslint-disable-next-line no-await-in-loop
              domain = await getAssetDomain(
                issuer.key,
                networkDetails.networkUrl,
                networkDetails.networkPassphrase,
              );
            } catch (e) {
              console.error(e);
            }
          }

          domains.push({
            code,
            issuer: issuer.key,
            image: balances.icons![getCanonicalFromAsset(code, issuer.key)],
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

      if (isSoroswapEnabled && isSwap && !assetSelect.isSource) {
        soroswapTokens.forEach((token) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          // const canonical = getCanonicalFromAsset(token.code, token.contract);
          const nativeContractDetails =
            getNativeContractDetails(networkDetails);

          // if we have a balance for a token, it will have been handled above.
          // This is designed to populate tokens available from Soroswap that the user does not already have
          if (
            balances &&
            // TODO: how to remake this check?
            // !balances[canonical] &&
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

      const payload = { domains, isManagingAssets, balances };
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
