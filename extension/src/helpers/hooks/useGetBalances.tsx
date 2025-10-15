import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAccountBalances,
  getAssetIcons,
  getHiddenAssets,
  getAssetIconCache,
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

const formatBalances = async ({
  publicKey,
  balances,
  showHidden,
}: {
  publicKey: string;
  balances: NonNullable<BalanceMap>;
  showHidden: boolean;
}) => {
  if (!showHidden) {
    const hiddenAssets = await getHiddenAssets({
      activePublicKey: publicKey,
    });
    return sortBalances(
      filterHiddenBalances(balances, hiddenAssets.hiddenAssets),
    );
  } else {
    return sortBalances(balances);
  }
};

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
    isScanSkipped = false,
  ): Promise<AccountBalances | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const cachedBalanceData =
        cachedBalances[networkDetails.network]?.[publicKey];
      const accountBalances =
        useCache && cachedBalanceData
          ? cachedBalanceData
          : await getAccountBalances(
              publicKey,
              networkDetails,
              isMainnet,
              isScanSkipped,
            );

      const payload = {
        isFunded: accountBalances.isFunded,
        subentryCount: accountBalances.subentryCount,
        error: accountBalances.error,
        balances: await formatBalances({
          publicKey,
          balances: accountBalances.balances as NonNullable<BalanceMap>,
          showHidden: options.showHidden,
        }),
      } as AccountBalances;

      if (options.includeIcons) {
        let cachedIconsFromCache = cachedIcons;
        if (!Object.keys(cachedIcons).length) {
          const backgroundCachedIcons = await getAssetIconCache({
            activePublicKey: publicKey,
          });

          cachedIconsFromCache = { ...backgroundCachedIcons.icons };
        }
        const assetsListsData =
          useCache && cachedTokenLists.length
            ? cachedTokenLists
            : await getCombinedAssetListData({
                networkDetails,
                assetsLists,
              });

        const icons = await getAssetIcons({
          balances: accountBalances.balances,
          networkDetails,
          assetsListsData,
          cachedIcons: cachedIconsFromCache,
        });
        payload.icons = icons;
        reduxDispatch(saveTokenLists(assetsListsData));
        reduxDispatch(saveIconsForBalances({ icons }));
      }

      if (!(useCache && !!cachedBalanceData)) {
        // we have fetched new balance data from the API, update the cache
        reduxDispatch(
          saveBalancesForAccount({
            publicKey,
            balances: accountBalances,
            networkDetails,
          }),
        );
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      storeBalanceMetricData(publicKey, accountBalances.isFunded || false);
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error(`Failed to fetch balances - ${error}`);
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetBalances, RequestState };
