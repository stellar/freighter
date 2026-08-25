import { useReducer } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

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
import { initialState, isCacheValid, reducer } from "helpers/request";
import { storeBalanceMetricData } from "helpers/metrics";
import { filterHiddenBalances, sortBalances } from "popup/helpers/account";
import { AssetType } from "@shared/api/types/account-balance";
import { settingsSelector } from "popup/ducks/settings";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { AppDispatch, AppState } from "popup/App";
import { balancesV2Selector } from "popup/ducks/remoteConfig";
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
  const unfilteredBalances = sortBalances(balances);
  if (!showHidden) {
    const hiddenAssets = await getHiddenAssets({
      activePublicKey: publicKey,
    });
    return {
      balances: sortBalances(
        filterHiddenBalances(balances, hiddenAssets.hiddenAssets),
      ),
      unfilteredBalances,
    };
  }
  return { balances: unfilteredBalances, unfilteredBalances };
};

export interface AccountBalances {
  balances: AssetType[];
  // `balances` with no visibility filtering. Hidden assets are a display
  // preference; anything that feeds transaction construction (e.g. "does a
  // trustline already exist?") must consult this list, or a hidden held asset
  // reads as unheld.
  unfilteredBalances?: AssetType[];
  isFunded: AccountBalancesInterface["isFunded"];
  subentryCount: AccountBalancesInterface["subentryCount"];
  error?: AccountBalancesInterface["error"];
  localOnlyTokenIds?: AccountBalancesInterface["localOnlyTokenIds"];
  icons?: AssetIcons;
}

function useGetBalances(options: {
  showHidden: boolean;
  includeIcons: boolean;
  // Canonicals to resolve icons for alongside the held balances (e.g. the
  // swap flow's default destination, which the account may not hold).
  additionalIconAssetIds?: string[];
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const store = useStore<AppState>();
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
    shouldSkipScan = false,
  ): Promise<AccountBalances | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const cachedBalanceData =
        cachedBalances[networkDetails.network]?.[publicKey];
      const isBalancesCacheValid = isCacheValid(cachedBalanceData);

      const accountBalances =
        useCache && isBalancesCacheValid
          ? cachedBalanceData
          : await getAccountBalances(
              publicKey,
              networkDetails,
              isMainnet,
              shouldSkipScan,
              // Read the flag from the store at call time (not a
              // render-captured value) so a freshly resolved Amplitude flag
              // isn't missed — mirrors useGetTokenPrices.
              balancesV2Selector(store.getState()),
            );

      const { balances, unfilteredBalances } = await formatBalances({
        publicKey,
        balances: accountBalances.balances as NonNullable<BalanceMap>,
        showHidden: options.showHidden,
      });
      const payload = {
        isFunded: accountBalances.isFunded,
        subentryCount: accountBalances.subentryCount,
        error: accountBalances.error,
        localOnlyTokenIds: accountBalances.localOnlyTokenIds,
        balances,
        unfilteredBalances,
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
          additionalAssetIds: options.additionalIconAssetIds,
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
