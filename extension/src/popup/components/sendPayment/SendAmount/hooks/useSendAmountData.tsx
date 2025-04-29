import { useReducer } from "react";

import { initialState, isError, reducer } from "helpers/request";
import { AssetIcons } from "@shared/api/types";
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
import { AppDataType, NeedsReRoute } from "helpers/hooks/useGetAppData";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { isMainnet } from "helpers/stellar";
import { NetworkDetails } from "@shared/constants/stellar";

interface ResolvedSendAmountData {
  type: AppDataType.RESOLVED;
  userBalances: AccountBalances;
  destinationBalances: AccountBalances;
  icons: AssetIcons;
  domains: ManageAssetCurrency[];
  applicationState: APPLICATION_STATE;
  publicKey: string;
  networkDetails: NetworkDetails;
}

type SendAmountData = NeedsReRoute | ResolvedSendAmountData;

function useGetSendAmountData(
  options: {
    showHidden: boolean;
    includeIcons: boolean;
  },
  destinationAddress?: string, // NOTE: can be a G or C address
) {
  const [state, dispatch] = useReducer(
    reducer<SendAmountData, unknown>,
    initialState,
  );

  const { fetchData: fetchAssetDomains } =
    useGetAssetDomainsWithBalances(options);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const userDomains = await fetchAssetDomains();
      if (isError<AssetDomains>(userDomains)) {
        throw new Error(userDomains.message);
      }

      if (userDomains.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: userDomains });
        return userDomains;
      }

      const _isMainnet = isMainnet(userDomains.networkDetails);
      const destinationBalances =
        destinationAddress && !isContractId(destinationAddress)
          ? await getAccountBalances(
              destinationAddress,
              userDomains.networkDetails,
              _isMainnet,
            )
          : ({} as AccountBalancesInterface);

      const payload = {
        type: AppDataType.RESOLVED,
        applicationState: userDomains.applicationState,
        publicKey: userDomains.publicKey,
        networkDetails: userDomains.networkDetails,
        userBalances: userDomains.balances,
        destinationBalances: {
          ...destinationBalances,
          balances: sortBalances(destinationBalances.balances),
        },
        icons: userDomains.balances.icons || {},
        domains: userDomains.domains,
      } as ResolvedSendAmountData;
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
