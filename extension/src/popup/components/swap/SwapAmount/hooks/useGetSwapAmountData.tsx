import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { initialState, isError, reducer } from "helpers/request";
import { ApiTokenPrices, AssetIcons } from "@shared/api/types";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { isContractId } from "popup/helpers/soroban";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
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
import { useGetTokenPrices } from "helpers/hooks/useGetTokenPrices";
import { settingsSelector } from "popup/ducks/settings";
import { tokensListsSelector, saveTokenLists } from "popup/ducks/cache";
import { AppDispatch, store } from "popup/App";

export interface ResolvedSwapAmountData {
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

type SwapAmountData = NeedsReRoute | ResolvedSwapAmountData;

function useGetSwapAmountData(
  options: {
    showHidden: boolean;
    includeIcons: boolean;
  },
  destinationAddress?: string, // NOTE: can be a G/C/M address
  destinationAsset?: string, // canonical of the selected destination token
  sourceAsset?: string, // canonical of the selected source token
) {
  const [state, dispatch] = useReducer(
    reducer<SwapAmountData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();
  const { assetsLists } = useSelector(settingsSelector);
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: true,
    includeIcons: false,
  });
  const { fetchData: fetchTokenPrices } = useGetTokenPrices();

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

      let tokenPrices = {} as ApiTokenPrices;
      if (_isMainnet) {
        const fetchedTokenPrices = await fetchTokenPrices({
          publicKey: userDomains.publicKey,
          // Price the account's held balances. The swap flow never sets a
          // destination account, so destinationBalances is always empty and
          // pricing it yields nothing — leaving the source price blank on a
          // stale-cache miss after a quote expiry.
          balances: userDomains.balances.balances,
          networkDetails: userDomains.networkDetails,
          useCache: true,
          // Price the selected source + destination tokens explicitly, even
          // when the account doesn't hold them.
          additionalAssetIds: [sourceAsset, destinationAsset].filter(
            (id): id is string => Boolean(id),
          ),
        });
        tokenPrices = fetchedTokenPrices.tokenPrices || {};
      }

      // The balances icon map only carries held-token logos, and a destination
      // that didn't come through the picker (the network USDC default or a
      // destination_asset deep link) has no picker-captured iconUrl either.
      // Resolve it from the same token lists the picker uses so both paths
      // render the same logo.
      let icons = userDomains.balances.icons || {};
      const [dstCode, dstIssuer] = (destinationAsset || "").split(":");
      if (destinationAsset && dstIssuer && !icons[destinationAsset]) {
        try {
          const cachedLists = tokensListsSelector(store.getState());
          const assetsListsData = cachedLists?.length
            ? cachedLists
            : await getCombinedAssetListData({
                networkDetails: userDomains.networkDetails,
                assetsLists,
                cachedAssetLists: [],
              });
          if (!cachedLists?.length && assetsListsData.length > 0) {
            reduxDispatch(saveTokenLists(assetsListsData));
          }
          const { icon } = await getIconFromTokenLists({
            issuerId: isContractId(dstIssuer) ? undefined : dstIssuer,
            contractId: isContractId(dstIssuer) ? dstIssuer : undefined,
            code: dstCode,
            assetsListsData,
          });
          if (icon) {
            icons = { ...icons, [destinationAsset]: icon };
          }
        } catch {
          // The logo is cosmetic — never fail the swap screen over it.
        }
      }

      const payload = {
        type: AppDataType.RESOLVED,
        applicationState: userDomains.applicationState,
        publicKey: userDomains.publicKey,
        networkDetails: userDomains.networkDetails,
        userBalances: userDomains.balances,
        destinationBalances,
        icons,
        domains: userDomains.domains,
        tokenPrices,
      } as ResolvedSwapAmountData;
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

export { useGetSwapAmountData };
