import { useReducer } from "react";

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
import { AppDataType, NeedsReRoute } from "helpers/hooks/useGetAppData";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

export interface ResolvedAssetVisibilityData {
  type: AppDataType.RESOLVED;
  balances: AccountBalances;
  domains: ManageAssetCurrency[];
  isManagingAssets: boolean;
  hiddenAssets: Record<IssuerKey, AssetVisibility>;
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
    issuer,
    visibility,
    publicKey,
  }: {
    issuer: IssuerKey;
    visibility: AssetVisibility;
    publicKey: string;
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
