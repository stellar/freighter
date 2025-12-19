import { useReducer } from "react";

import { NetworkDetails } from "@shared/constants/stellar";
import { initialState, isError, reducer } from "helpers/request";

import { isMainnet } from "helpers/stellar";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useGetTokenPrices } from "helpers/hooks/useGetTokenPrices";
import { ApiTokenPrices, Collectibles } from "@shared/api/types";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { useGetCollectibles } from "helpers/hooks/useGetCollectibles";

export interface ResolvedAssetDomains {
  type: AppDataType.RESOLVED;
  publicKey: string;
  balances: AccountBalances;
  networkDetails: NetworkDetails;
  applicationState: APPLICATION_STATE;
  tokenPrices: ApiTokenPrices;
  collectibles: Collectibles;
}

export type AssetDomains = NeedsReRoute | ResolvedAssetDomains;

export function useGetDestAssetData(getBalancesOptions: {
  showHidden: boolean;
  includeIcons: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer<AssetDomains, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(getBalancesOptions);
  const { fetchData: fetchTokenPrices } = useGetTokenPrices();
  const { fetchData: fetchCollectibles } = useGetCollectibles({
    useCache: true,
  });

  const fetchData = async (useCache = false): Promise<AssetDomains | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData(useCache);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const balances = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
        useCache,
      );

      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }

      const fetchedTokenPrices = await fetchTokenPrices({
        publicKey,
        balances: balances.balances,
        useCache: true,
      });

      const payload = {
        type: AppDataType.RESOLVED,
        balances,
        publicKey,
        networkDetails,
        tokenPrices: fetchedTokenPrices.tokenPrices,
        applicationState: appData.account.applicationState,
      } as ResolvedAssetDomains;

      if (!isCustomNetwork(networkDetails)) {
        const collectiblesResult = await fetchCollectibles({
          publicKey,
          networkDetails,
        });

        payload.collectibles = collectiblesResult;
      }
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error(`Failed to fetch domains - ${error}`);
    }
  };

  return {
    state,
    fetchData,
  };
}
