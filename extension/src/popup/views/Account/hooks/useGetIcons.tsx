import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { RequestState } from "constants/request";
import { initialState, reducer } from "helpers/request";
import { AppDataType, NeedsReRoute } from "helpers/hooks/useGetAppData";
import { AppDispatch } from "popup/App";
import { Balances } from "@shared/api/types/backend-api";
import {
  balancesSelector,
  saveIconsForBalances,
  saveTokenLists,
  tokensListsSelector,
} from "popup/ducks/cache";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import {
  getAssetIconCache,
  getAssetIconsFromCache,
  getAssetIcons,
} from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";

interface ResolvedAccountIconsData {
  type: AppDataType.RESOLVED;
  icons: { [code: string]: string | null };
}

export type AccountIconsData = NeedsReRoute | ResolvedAccountIconsData;

function useGetIcons() {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<AccountIconsData, unknown>,
    initialState,
  );
  const cachedBalances = useSelector(balancesSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);
  const { assetsLists } = useSelector(settingsSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  /* 
 First,  Use tokens lists to fetch icons for assets that don't have icons in the cache 
 Second, try using the home_domain to fetch icons
 Anything found will be save to the long-lived cache in Background
  */
  const lookupIconData = async ({
    assetsWithoutIcons,
    assetsWithIcons,
  }: {
    assetsWithoutIcons: Balances;
    assetsWithIcons: { [code: string]: string };
  }) => {
    try {
      const payload = {
        type: AppDataType.RESOLVED,
      } as ResolvedAccountIconsData;

      const assetsListsData = cachedTokenLists.length
        ? cachedTokenLists
        : await getCombinedAssetListData({
            networkDetails,
            assetsLists,
          });

      const updatedIcons = await getAssetIcons({
        balances: assetsWithoutIcons,
        networkDetails,
        assetsListsData,
        cachedIcons: {},
      });
      payload.icons = { ...assetsWithIcons, ...updatedIcons };
      reduxDispatch(saveIconsForBalances({ icons: updatedIcons }));
      reduxDispatch(saveTokenLists(assetsListsData));
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      captureException(`Error looking up icon data - ${error}`);
      return error;
    }
  };

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = {
        type: AppDataType.RESOLVED,
      } as ResolvedAccountIconsData;
      const backgroundCachedIcons = await getAssetIconCache({
        activePublicKey: publicKey,
      });
      const accountBalances =
        cachedBalances[networkDetails.network]?.[publicKey]?.balances;

      const cachedIcons = backgroundCachedIcons.icons;
      let icons = {} as { [code: string]: string };

      if (Object.keys(cachedIcons).length) {
        icons = await getAssetIconsFromCache({
          balances:
            cachedBalances[networkDetails.network]?.[publicKey]?.balances,
          cachedIcons,
        });

        payload.icons = icons;
        reduxDispatch(saveIconsForBalances({ icons }));
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      }

      if (accountBalances) {
        const assetsWithoutIcons = {} as NonNullable<Balances>;

        Object.entries(accountBalances).forEach(([asset, balance]) => {
          if (!icons[asset] && asset !== "native") {
            assetsWithoutIcons[asset] = balance;
          }
        });
        if (Object.keys(assetsWithoutIcons).length > 0) {
          await lookupIconData({
            assetsWithoutIcons,
            assetsWithIcons: icons,
          });
        }
      }

      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      captureException(`Error loading icons on Account - ${error}`);
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetIcons, RequestState };
