import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { ManageAssetCurrency } from "../../ManageAssetRows";
import { IssuerKey, AssetVisibility, SoroswapToken } from "@shared/api/types";
import {
  AssetDomains,
  useGetAssetDomainsWithBalances,
} from "helpers/hooks/useGetAssetDomainsWithBalances";
import {
  getHiddenAssets,
  changeAssetVisibility as internalChangeAssetVisibility,
} from "@shared/api/internal";
import { useGetSoroswapTokens } from "helpers/hooks/useGetSoroswapTokens";
import { useIsSoroswapEnabled } from "popup/helpers/useIsSwap";

export interface AssetVisibilityData {
  balances: AccountBalances;
  soroswapTokens: SoroswapToken[];
  domains: ManageAssetCurrency[];
  isManagingAssets: boolean;
  hiddenAssets: Record<IssuerKey, AssetVisibility>;
}

function useGetAssetData(
  publicKey: string,
  networkDetails: NetworkDetails,
  options: {
    isMainnet: boolean;
    showHidden: boolean;
    includeIcons: boolean;
  },
) {
  const isSoroswapSupported = useIsSoroswapEnabled();
  const [state, dispatch] = useReducer(
    reducer<AssetVisibilityData, unknown>,
    initialState,
  );
  const { fetchData: fetchDomainsWithBalances } =
    useGetAssetDomainsWithBalances(publicKey, networkDetails, options);

  const { fetchData: getTokens } = useGetSoroswapTokens();

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const domainsResult = await fetchDomainsWithBalances();
      const { hiddenAssets, error: hiddenAssetError } = await getHiddenAssets({
        activePublicKey: publicKey,
      });
      const soroswapTokens = isSoroswapSupported
        ? await getTokens()
        : { assets: [] };

      if (isError<{ assets: SoroswapToken[] }>(soroswapTokens)) {
        throw new Error(soroswapTokens.message);
      }

      if (isError<AssetDomains>(domainsResult)) {
        throw new Error(domainsResult.message);
      }

      if (hiddenAssetError) {
        throw new Error(hiddenAssetError);
      }

      const payload = {
        ...domainsResult,
        hiddenAssets,
        soroswapTokens: soroswapTokens.assets,
      } as AssetVisibilityData;

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  const changeAssetVisibility = async ({
    issuer,
    visibility,
  }: {
    issuer: IssuerKey;
    visibility: AssetVisibility;
  }) => {
    const { hiddenAssets, error } = await internalChangeAssetVisibility({
      assetIssuer: issuer,
      assetVisibility: visibility,
      activePublicKey: publicKey,
    });

    if (error) {
      throw new Error(error);
    }

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
