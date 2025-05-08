import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAccountBalances,
  getAssetIcons,
  getHiddenAssets,
} from "@shared/api/internal";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetIcons } from "@shared/api/types";
import {
  AccountBalancesInterface,
  BalanceMap,
} from "@shared/api/types/backend-api";
import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { storeBalanceMetricData } from "helpers/metrics";
import { filterHiddenBalances, sortBalances } from "popup/helpers/account";
import { AssetType } from "@shared/api/types/account-balance";
import { settingsSelector } from "popup/ducks/settings";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { AppDispatch } from "popup/App";
import {
  balancesSelector,
  iconsSelector,
  saveBalancesForAccount,
  saveIconsForBalances,
  saveTokenLists,
  tokensListsSelector,
} from "popup/ducks/cache";

export interface AccountBalances {
  balances: AssetType[];
  isFunded: AccountBalancesInterface["isFunded"];
  subentryCount: AccountBalancesInterface["subentryCount"];
  error?: AccountBalancesInterface["error"];
  icons?: AssetIcons;
}

function useGetBalances(options: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<AccountBalances, unknown>,
    initialState,
  );
  const { assetsLists } = useSelector(settingsSelector);
  const cachedBalances = useSelector(balancesSelector);
  const cachedIcons = useSelector(iconsSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);

  const fetchData = async (
    publicKey: string,
    isMainnet: boolean,
    networkDetails: NetworkDetails,
    useCache = false,
  ): Promise<AccountBalances | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const cachedBalanceData = cachedBalances[publicKey];
      if (useCache && cachedBalanceData) {
        const payload = {
          isFunded: cachedBalanceData.isFunded,
          subentryCount: cachedBalanceData.subentryCount,
          error: cachedBalanceData.error,
        } as AccountBalances;

        if (!options.showHidden) {
          const hiddenAssets = await getHiddenAssets({
            activePublicKey: publicKey,
          });
          payload.balances = sortBalances(
            filterHiddenBalances(
              cachedBalanceData.balances as NonNullable<BalanceMap>,
              hiddenAssets.hiddenAssets,
            ),
          );
        } else {
          payload.balances = sortBalances(cachedBalanceData.balances);
        }

        if (options.includeIcons) {
          const assetsListsData = cachedTokenLists.length
            ? cachedTokenLists
            : await getCombinedAssetListData({
                networkDetails,
                assetsLists,
              });

          const icons = await getAssetIcons({
            balances: cachedBalanceData.balances,
            networkDetails,
            assetsListsData,
            cachedIcons,
          });
          payload.icons = icons;
        }

        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        storeBalanceMetricData(publicKey, cachedBalanceData.isFunded || false);
        return payload;
      } else {
        const data = await getAccountBalances(
          publicKey,
          networkDetails,
          isMainnet,
        );

        const payload = {
          isFunded: data.isFunded,
          subentryCount: data.subentryCount,
          error: data.error,
        } as AccountBalances;

        if (!options.showHidden) {
          const hiddenAssets = await getHiddenAssets({
            activePublicKey: publicKey,
          });
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
          const assetsListsData = await getCombinedAssetListData({
            networkDetails,
            assetsLists,
          });

          const icons = await getAssetIcons({
            balances: data.balances,
            networkDetails,
            assetsListsData,
            cachedIcons,
          });
          payload.icons = icons;
          reduxDispatch(saveTokenLists(assetsListsData));
          reduxDispatch(saveIconsForBalances({ icons }));
        }

        reduxDispatch(
          saveBalancesForAccount({
            publicKey,
            balances: data,
          }),
        );
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        storeBalanceMetricData(publicKey, data.isFunded || false);
        return payload;
      }
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch balances", { cause: error });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetBalances, RequestState };
