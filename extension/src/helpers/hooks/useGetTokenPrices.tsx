import { useReducer } from "react";
import { captureException } from "@sentry/browser";
import { useDispatch, useSelector } from "react-redux";
import { tokenPricesSelector } from "popup/ducks/cache";
import { getTokenPrices } from "@shared/api/internal";
import { initialState, isCacheValid, reducer } from "helpers/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { getCanonicalFromAsset } from "helpers/stellar";
import { ApiTokenPrices } from "@shared/api/types";
import { saveTokenPrices } from "popup/ducks/cache";
import { AppDispatch } from "popup/App";
import { AccountBalances } from "./useGetBalances";

export interface GetTokenPricesData {
  type: AppDataType.RESOLVED;
  tokenPrices: ApiTokenPrices | null;
}

export function useGetTokenPrices() {
  const reduxDispatch = useDispatch<AppDispatch>();
  const cachedTokenPrices = useSelector(tokenPricesSelector);

  const [state, dispatch] = useReducer(
    reducer<GetTokenPricesData, unknown>,
    initialState,
  );
  const fetchData = async ({
    publicKey,
    balances,
    useCache = false,
    additionalAssetIds = [],
  }: {
    publicKey: string;
    balances: AccountBalances["balances"];
    useCache: boolean;
    // Extra canonicals to price beyond the account's balances — e.g. a swap
    // destination token the account doesn't hold yet.
    additionalAssetIds?: string[];
  }): Promise<GetTokenPricesData> => {
    dispatch({ type: "FETCH_DATA_START" });

    let tokenPrices = {} as ApiTokenPrices;
    const publicKeyTokenPrices = cachedTokenPrices[publicKey];
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
          const fetchedTokenPrices = await getTokenPrices(assetIds);
          reduxDispatch(
            saveTokenPrices({ publicKey, tokenPrices: fetchedTokenPrices }),
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

    // Best-effort: additively price any requested extra ids (e.g. a non-held
    // swap destination) that the balance prices don't already cover. This runs
    // as a SEPARATE request and swallows its own errors so a failure here can
    // never wipe the (reliable) balance prices — the destination just falls back
    // to its stellar.expert spot price downstream.
    if (payload.tokenPrices) {
      const resolved = payload.tokenPrices;
      const missingExtra = additionalAssetIds.filter((id) => !(id in resolved));
      if (missingExtra.length) {
        try {
          const extraPrices = await getTokenPrices(missingExtra);
          const mergedTokenPrices = { ...resolved, ...extraPrices };
          reduxDispatch(
            saveTokenPrices({ publicKey, tokenPrices: mergedTokenPrices }),
          );
          payload.tokenPrices = mergedTokenPrices;
        } catch (e) {
          captureException(
            `Failed to fetch additional token prices in useGetTokenPrices - ${e}`,
          );
        }
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
