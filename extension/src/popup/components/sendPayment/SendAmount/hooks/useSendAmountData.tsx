import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, reducer } from "helpers/request";
import {
  AccountBalancesInterface,
  AssetIcons,
  Balance,
  BalanceMap,
  Balances,
} from "@shared/api/types";
import {
  getAccountBalances,
  getAssetIcons,
  getHiddenAssets,
} from "@shared/api/internal";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { filterHiddenBalances, sortBalances } from "popup/helpers/account";
import { useIsSoroswapEnabled, useIsSwap } from "popup/helpers/useIsSwap";
import { useSelector } from "react-redux";
import {
  AssetSelectType,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { getAssetDomain } from "popup/helpers/getAssetDomain";
import { getCanonicalFromAsset } from "helpers/stellar";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { isContractId } from "popup/helpers/soroban";

interface SendAmountData {
  userBalances: AccountBalancesInterface;
  destinationBalances: AccountBalancesInterface;
  icons: AssetIcons;
  domains: ManageAssetCurrency[];
}

function useGetSendAmountData(
  publicKey: string,
  networkDetails: NetworkDetails,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
  },
  destinationAddress?: string, // NOTE: can be a G or C address
) {
  const [state, dispatch] = useReducer(
    reducer<SendAmountData, unknown>,
    initialState,
  );
  const isSwap = useIsSwap();
  const isSoroswapEnabled = useIsSoroswapEnabled();
  const { assetSelect, soroswapTokens } = useSelector(
    transactionSubmissionSelector,
  );

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const isManagingAssets = assetSelect.type === AssetSelectType.MANAGE;

      const userBalances = await getAccountBalances(
        publicKey,
        networkDetails,
        options.isMainnet,
      );
      const destinationBalances =
        destinationAddress && !isContractId(destinationAddress)
          ? await getAccountBalances(
              destinationAddress,
              networkDetails,
              options.isMainnet,
            )
          : ({} as AccountBalancesInterface);

      const balances = {
        ...userBalances.balances,
        ...destinationBalances.balances,
      } as Balances;
      const icons = await getAssetIcons({
        balances,
        networkDetails,
      });

      const domains = [] as ManageAssetCurrency[];
      const hiddenAssets = await getHiddenAssets();
      const balancesList = sortBalances(
        filterHiddenBalances(
          balances as NonNullable<BalanceMap>,
          hiddenAssets.hiddenAssets,
        ),
      ) as Balance[];
      // TODO: cache home domain when getting asset icon
      // https://github.com/stellar/freighter/issues/410
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < balancesList.length; i += 1) {
        if (balancesList[i].liquidityPoolId) {
          // eslint-disable-next-line
          continue;
        }

        const { token, contractId, blockaidData } = balancesList[i];

        const code = token.code || "";
        let issuer = {
          key: "",
        };

        if ("issuer" in token) {
          issuer = token.issuer;
        }

        // If we are in the swap flow and the asset has decimals (is a token), we skip it if Soroswap is not enabled
        if ("decimals" in balancesList[i] && isSwap && !isSoroswapEnabled) {
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

      const payload = {
        userBalances,
        destinationBalances,
        icons,
        domains,
      };
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

export { useGetSendAmountData };
