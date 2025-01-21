import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import {
  AssetSelectType,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  settingsNetworkDetailsSelector,
  settingsSorobanSupportedSelector,
} from "popup/ducks/settings";
import { getCanonicalFromAsset } from "helpers/stellar";
import { isAssetSuspicious } from "./blockaid";
import { getNativeContractDetails } from "./searchAsset";
import { useIsSoroswapEnabled, useIsSwap } from "./useIsSwap";
import { sortBalances } from "./account";
import { getAssetDomain } from "./getAssetDomain";

export const useFetchDomains = () => {
  const isSwap = useIsSwap();
  const isSoroswapEnabled = useIsSoroswapEnabled();
  const { assetIcons, assetSelect, soroswapTokens, accountBalances } =
    useSelector(transactionSubmissionSelector);
  const isSorobanSuported = useSelector(settingsSorobanSupportedSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const isManagingAssets = assetSelect.type === AssetSelectType.MANAGE;
  const { balances } = accountBalances;

  const [assets, setAssets] = useState({
    assetRows: [] as ManageAssetCurrency[],
    // TODO: REFACTOR getAccountBalances to a hook
    // This loading state should be derived from the lifecycle of fetching account balances
    // but the shared store state can cause this to be out of sync, and glitch the empty state.
    isLoading: true,
  });

  useEffect(() => {
    const fetchDomains = async () => {
      if (!balances || assets.assetRows.length) {
        return;
      }

      setAssets({
        assetRows: [],
        isLoading: true,
      });

      const collection = [] as ManageAssetCurrency[];
      const sortedBalances = sortBalances(balances);

      // TODO: cache home domain when getting asset icon
      // https://github.com/stellar/freighter/issues/410
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < sortedBalances.length; i += 1) {
        if (sortedBalances[i].liquidityPoolId) {
          // eslint-disable-next-line
          continue;
        }

        const { token, contractId, blockaidData } = sortedBalances[i];

        const code = token.code || "";
        let issuer = {
          key: "",
        };

        if ("issuer" in token) {
          issuer = token.issuer;
        }

        // If we are in the swap flow and the asset has decimals (is a token), we skip it if Soroswap is not enabled
        if ("decimals" in sortedBalances[i] && isSwap && !isSoroswapEnabled) {
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

          collection.push({
            code,
            issuer: issuer.key,
            image: assetIcons[getCanonicalFromAsset(code, issuer.key)],
            domain,
            contract: contractId,
            isSuspicious: isAssetSuspicious(blockaidData),
          });
          // include native asset for asset dropdown selection
        } else if (!isManagingAssets) {
          collection.push({
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
          const canonical = getCanonicalFromAsset(token.code, token.contract);
          const nativeContractDetails =
            getNativeContractDetails(networkDetails);

          // if we have a balance for a token, it will have been handled above.
          // This is designed to populate tokens available from Soroswap that the user does not already have
          if (
            balances &&
            !balances[canonical] &&
            token.contract !== nativeContractDetails.contract
          ) {
            collection.push({
              code: token.code,
              issuer: token.contract,
              image: token.icon,
              domain: "",
              icon: token.icon,
            });
          }
        });
      }

      setAssets({
        assetRows: collection,
        isLoading: false,
      });
    };
    fetchDomains();
  }, [
    assets.assetRows,
    assetIcons,
    balances,
    isManagingAssets,
    isSorobanSuported,
    isSwap,
    isSoroswapEnabled,
    assetSelect.isSource,
    soroswapTokens,
    networkDetails,
  ]);

  return {
    assets,
    isManagingAssets,
  };
};
