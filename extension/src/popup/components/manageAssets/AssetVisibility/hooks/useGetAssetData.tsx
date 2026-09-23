import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { ManageAssetCurrency } from "../../ManageAssetRows";
import { AssetKey, AssetVisibility } from "@shared/api/types";
import {
  AssetDomains,
  useGetAssetDomainsWithBalances,
} from "helpers/hooks/useGetAssetDomainsWithBalances";
import {
  getHiddenAssets,
  changeAssetVisibility as internalChangeAssetVisibility,
} from "@shared/api/internal";
import { AppDataType, NeedsReRoute } from "helpers/hooks/useGetAppData";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AppDispatch } from "popup/App";
import { saveHiddenAssets } from "popup/ducks/hiddenAssets";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

export interface ResolvedAssetVisibilityData {
  type: AppDataType.RESOLVED;
  balances: AccountBalances;
  domains: ManageAssetCurrency[];
  isManagingAssets: boolean;
  hiddenAssets: Record<AssetKey, AssetVisibility>;
  publicKey: string;
  applicationState: APPLICATION_STATE;
}

export type AssetVisibilityData = NeedsReRoute | ResolvedAssetVisibilityData;

function useGetAssetData(options: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<AssetVisibilityData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { fetchData: fetchDomainsWithBalances } =
    useGetAssetDomainsWithBalances(options);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const domainsResult = await fetchDomainsWithBalances();
      if (isError<AssetDomains>(domainsResult)) {
        throw new Error(domainsResult.message);
      }

      if (domainsResult.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: domainsResult });
        return domainsResult;
      }

      const { hiddenAssets, error: hiddenAssetError } = await getHiddenAssets({
        activePublicKey: domainsResult.publicKey,
      });

      if (hiddenAssetError) {
        throw new Error(hiddenAssetError);
      }

      const payload = {
        ...domainsResult,
        hiddenAssets,
        type: AppDataType.RESOLVED,
        applicationState: domainsResult.applicationState,
      } as ResolvedAssetVisibilityData;

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  const changeAssetVisibility = async ({
    assetKey,
    visibility,
    publicKey,
  }: {
    assetKey: AssetKey;
    visibility: AssetVisibility;
    publicKey: string;
  }) => {
    const { hiddenAssets, error } = await internalChangeAssetVisibility({
      assetKey,
      assetVisibility: visibility,
      activePublicKey: publicKey,
    });

    if (error) {
      throw new Error(error);
    }

    // Keep the redux mirror in step. Every writer has to do this: the account
    // list filters against the mirror, so a write that only lands in the
    // background leaves an asset wrongly hidden (or shown) until a reload.
    reduxDispatch(
      saveHiddenAssets({
        publicKey,
        networkName: networkDetails.networkName,
        hiddenAssets,
      }),
    );

    const payload = {
      ...state.data,
      hiddenAssets,
    } as AssetVisibilityData;

    dispatch({ type: "FETCH_DATA_SUCCESS", payload });
    return payload;
  };

  return {
    state,
    fetchData,
    changeAssetVisibility,
  };
}

export { useGetAssetData, RequestState };
