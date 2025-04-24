import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { ManageAssetCurrency } from "../../ManageAssetRows";
import { IssuerKey, AssetVisibility } from "@shared/api/types";
import {
  AssetDomains,
  useGetAssetDomainsWithBalances,
} from "helpers/hooks/useGetAssetDomainsWithBalances";
import {
  getHiddenAssets,
  changeAssetVisibility as internalChangeAssetVisibility,
} from "@shared/api/internal";

export interface AssetVisibilityData {
  balances: AccountBalances;
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
  const [state, dispatch] = useReducer(
    reducer<AssetVisibilityData, unknown>,
    initialState,
  );
  const { fetchData: fetchDomainsWithBalances } =
    useGetAssetDomainsWithBalances(publicKey, networkDetails, options);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const domainsResult = await fetchDomainsWithBalances();
      const { hiddenAssets, error: hiddenAssetError } = await getHiddenAssets({
        activePublicKey: publicKey,
      });

      if (isError<AssetDomains>(domainsResult)) {
        throw new Error(domainsResult.message);
      }

      if (hiddenAssetError) {
        throw new Error(hiddenAssetError);
      }

      const payload = {
        ...domainsResult,
        hiddenAssets,
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
