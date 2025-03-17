import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, reducer } from "helpers/request";
import { AccountBalancesInterface, AssetIcons } from "@shared/api/types";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { isContractId } from "popup/helpers/soroban";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import {
  isGetAssetDomainsError,
  useGetAssetDomains,
} from "helpers/hooks/useGetAssetDomains";
import { getAccountBalances } from "@shared/api/internal";
import { sortBalances } from "popup/helpers/account";

interface SendAmountData {
  userBalances: AccountBalances;
  destinationBalances: AccountBalances;
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
  const [state, dispatch] = useReducer(
    reducer<SendAmountData, unknown>,
    initialState,
  );

  const { fetchData: fetchAssetDomains } = useGetAssetDomains(
    publicKey,
    networkDetails,
    options,
  );

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

      if (isGetAssetDomainsError(userDomains)) {
        throw new Error(userDomains.message);
      }

      const payload = {
        userBalances: userDomains.balances,
        destinationBalances: {
          ...destinationBalances,
          balances: sortBalances(destinationBalances.balances),
        },
        icons: userDomains.balances.icons!,
        domains: userDomains.domains,
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
