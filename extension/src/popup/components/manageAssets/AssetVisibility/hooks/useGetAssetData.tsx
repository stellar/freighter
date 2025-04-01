import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { ManageAssetCurrency } from "../../ManageAssetRows";
import { AssetKey, AssetVisibility } from "@shared/api/types";
import {
  AssetDomains,
  useGetAssetDomainsWithBalances,
} from "helpers/hooks/useGetAssetDomainsWithBalances";
import { getHiddenAssets } from "@shared/api/internal";

interface AssetVisibilityData {
  balances: AccountBalances;
  domains: ManageAssetCurrency[];
  isManagingAssets: boolean;
  hiddenAssets: Record<AssetKey, AssetVisibility>;
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

  return {
    state,
    fetchData,
  };
}

export { useGetAssetData, RequestState };
