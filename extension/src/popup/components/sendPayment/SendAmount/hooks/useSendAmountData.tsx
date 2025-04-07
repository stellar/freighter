import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, isError, reducer } from "helpers/request";
import { AssetIcons, SoroswapToken } from "@shared/api/types";
import { AccountBalancesInterface } from "@shared/api/types/backend-api";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { isContractId } from "popup/helpers/soroban";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import {
  AssetDomains,
  useGetAssetDomainsWithBalances,
} from "helpers/hooks/useGetAssetDomainsWithBalances";
import { getAccountBalances } from "@shared/api/internal";
import { sortBalances } from "popup/helpers/account";
import { useGetSoroswapTokens } from "helpers/hooks/useGetSoroswapTokens";
import { useIsSoroswapEnabled } from "popup/helpers/useIsSwap";

interface SendAmountData {
  userBalances: AccountBalances;
  destinationBalances: AccountBalances;
  soroswapTokens: SoroswapToken[];
  icons: AssetIcons;
  domains: ManageAssetCurrency[];
}

function useGetSendAmountData(
  publicKey: string,
  networkDetails: NetworkDetails,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
  destinationAddress?: string, // NOTE: can be a G or C address
) {
  const isSoroswapSupported = useIsSoroswapEnabled();
  const [state, dispatch] = useReducer(
    reducer<SendAmountData, unknown>,
    initialState,
  );

  const { fetchData: fetchAssetDomains } = useGetAssetDomainsWithBalances(
    publicKey,
    networkDetails,
    true,
    false,
    options,
  );
  const { fetchData: getTokens } = useGetSoroswapTokens();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const userDomains = await fetchAssetDomains();
      const destinationBalances =
        destinationAddress && !isContractId(destinationAddress)
          ? await getAccountBalances(
              destinationAddress,
              networkDetails,
              options.isMainnet,
            )
          : ({} as AccountBalancesInterface);
      const soroswapTokens = isSoroswapSupported
        ? await getTokens()
        : { assets: [] };

      if (isError<AssetDomains>(userDomains)) {
        throw new Error(userDomains.message);
      }

      if (isError<{ assets: SoroswapToken[] }>(soroswapTokens)) {
        throw new Error(soroswapTokens.message);
      }

      const payload = {
        userBalances: userDomains.balances,
        destinationBalances: {
          ...destinationBalances,
          balances: sortBalances(destinationBalances.balances),
        },
        icons: userDomains.balances.icons || {},
        domains: userDomains.domains,
        soroswapTokens: soroswapTokens.assets,
      } as SendAmountData;
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
