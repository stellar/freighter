import { useReducer } from "react";

import { initialState, isError, reducer } from "helpers/request";
import { ApiTokenPrices, AssetIcons } from "@shared/api/types";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { isContractId } from "popup/helpers/soroban";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  AssetDomains,
  useGetAssetDomainsWithBalances,
} from "helpers/hooks/useGetAssetDomainsWithBalances";
import { getBaseAccount } from "popup/helpers/account";
import { AppDataType, NeedsReRoute } from "helpers/hooks/useGetAppData";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { isMainnet } from "helpers/stellar";
import { NetworkDetails } from "@shared/constants/stellar";
import { getTokenPrices } from "popup/views/Account/hooks/useGetAccountData";

export interface ResolvedSendAmountData {
  type: AppDataType.RESOLVED;
  userBalances: AccountBalances;
  destinationBalances: AccountBalances;
  icons: AssetIcons;
  domains: ManageAssetCurrency[];
  applicationState: APPLICATION_STATE;
  publicKey: string;
  networkDetails: NetworkDetails;
  tokenPrices: ApiTokenPrices;
}

type SendAmountData = NeedsReRoute | ResolvedSendAmountData;

function useGetSendAmountData(
  options: {
    showHidden: boolean;
    includeIcons: boolean;
  },
  destinationAddress?: string, // NOTE: can be a G/C/M address
) {
  const [state, dispatch] = useReducer(
    reducer<SendAmountData, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: true,
    includeIcons: false,
  });

  const { fetchData: fetchAssetDomains } =
    useGetAssetDomainsWithBalances(options);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const userDomains = await fetchAssetDomains(true);
      let destinationAccount = await getBaseAccount(destinationAddress);

      if (isError<AssetDomains>(userDomains)) {
        throw new Error(userDomains.message);
      }

      if (userDomains.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: userDomains });
        return userDomains;
      }

      const _isMainnet = isMainnet(userDomains.networkDetails);
      let destinationBalances = {} as AccountBalances;
      if (destinationAccount && !isContractId(destinationAccount)) {
        const balances = await fetchBalances(
          destinationAccount,
          _isMainnet,
          userDomains.networkDetails,
          true,
        );
        if (isError<AccountBalances>(balances)) {
          throw new Error(balances.message);
        }
        destinationBalances = balances;
      }

      const payload = {
        type: AppDataType.RESOLVED,
        applicationState: userDomains.applicationState,
        publicKey: userDomains.publicKey,
        networkDetails: userDomains.networkDetails,
        userBalances: userDomains.balances,
        destinationBalances,
        icons: userDomains.balances.icons || {},
        domains: userDomains.domains,
        tokenPrices: _isMainnet
          ? await getTokenPrices({
              balances: userDomains.balances.balances,
            })
          : {},
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
