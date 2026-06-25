import { useReducer } from "react";
import { captureException } from "@sentry/browser";
import { useDispatch, useSelector, useStore } from "react-redux";
import { tokenPricesSelector } from "popup/ducks/cache";
import { tokenPricesV2Selector } from "popup/ducks/remoteConfig";
import { getTokenPrices } from "@shared/api/internal";
import { initialState, isCacheValid, reducer } from "helpers/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { getCanonicalFromAsset } from "helpers/stellar";
import { ApiTokenPrices } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { saveTokenPrices } from "popup/ducks/cache";
import { AppDispatch, AppState } from "popup/App";
import { AccountBalances } from "./useGetBalances";

export interface GetTokenPricesData {
  type: AppDataType.RESOLVED;
  tokenPrices: ApiTokenPrices | null;
}

export function useGetTokenPrices() {
  const reduxDispatch = useDispatch<AppDispatch>();
  const store = useStore<AppState>();
  const cachedTokenPrices = useSelector(tokenPricesSelector);

  const [state, dispatch] = useReducer(
    reducer<GetTokenPricesData, unknown>,
    initialState,
  );
  const fetchData = async ({
    publicKey,
    balances,
    networkDetails,
    useCache = false,
  }: {
    publicKey: string;
    balances: AccountBalances["balances"];
    networkDetails: NetworkDetails;
    useCache: boolean;
  }): Promise<GetTokenPricesData> => {
    dispatch({ type: "FETCH_DATA_START" });

    let tokenPrices = {} as ApiTokenPrices;
    const publicKeyTokenPrices =
      cachedTokenPrices[networkDetails.networkPassphrase]?.[publicKey];
    const payload = {
      type: AppDataType.RESOLVED,
      tokenPrices,
    } as GetTokenPricesData;

    const isTokenCacheValid = isCacheValid(publicKeyTokenPrices);
    if (useCache && isTokenCacheValid) {
      const payloadTokenPrices = {
        ...publicKeyTokenPrices,
      } as ApiTokenPrices;
      // to keep symmetry with the response, we don't want to return the updatedAt field
      delete payloadTokenPrices.updatedAt;
      payload.tokenPrices = payloadTokenPrices;
    } else {
      try {
        const assetIds = balances
          .filter((balance) => "token" in balance)
          .map((balance) =>
            getCanonicalFromAsset(
              balance.token.code,
              "issuer" in balance.token ? balance.token.issuer.key : undefined,
            ),
          );
        if (assetIds.length) {
          // Read the flag from the store at call time (not a render-captured
          // value) so a freshly resolved Amplitude flag isn't missed when this
          // fetch runs inside a long-lived async flow that closed over a stale
          // default.
          const useV2 = tokenPricesV2Selector(store.getState());
          const fetchedTokenPrices = await getTokenPrices(
            assetIds,
            networkDetails,
            useV2,
          );
          reduxDispatch(
            saveTokenPrices({
              publicKey,
              networkDetails,
              tokenPrices: fetchedTokenPrices,
            }),
          );
          payload.tokenPrices = fetchedTokenPrices;
        }
      } catch (e) {
        captureException(
          `Failed to fetch token prices in useGetTokenPrices - ${e}`,
        );
        payload.tokenPrices = null;
      }
    }
    dispatch({ type: "FETCH_DATA_SUCCESS", payload });
    return payload;
  };

  return {
    state,
    fetchData,
  };
}
