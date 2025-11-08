import { useReducer } from "react";
import { captureException } from "@sentry/browser";
import { useDispatch, useSelector } from "react-redux";
import { tokenPricesSelector } from "popup/ducks/cache";
import { getTokenPrices } from "@shared/api/internal";
import { initialState, reducer } from "helpers/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { getCanonicalFromAsset } from "helpers/stellar";
import { ApiTokenPrices } from "@shared/api/types";
import { saveTokenPrices } from "popup/ducks/cache";
import { AppDispatch } from "popup/App";
import { AccountBalances } from "./useGetBalances";

export interface GetTokenPricesData {
  type: AppDataType.RESOLVED;
  tokenPrices: ApiTokenPrices;
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
  }: {
    publicKey: string;
    balances: AccountBalances["balances"];
  }): Promise<GetTokenPricesData> => {
    dispatch({ type: "FETCH_DATA_START" });

    let tokenPrices = {} as ApiTokenPrices;
    const publicKeyTokenPrices = cachedTokenPrices[publicKey];
    const payload = {
      type: AppDataType.RESOLVED,
      tokenPrices,
    } as GetTokenPricesData;

    if (
      publicKeyTokenPrices &&
      publicKeyTokenPrices.updatedAt > Date.now() - 30000 // 30 seconds
    ) {
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
          console.log("fetchedTokenPrices", fetchedTokenPrices);
          reduxDispatch(
            saveTokenPrices({ publicKey, tokenPrices: fetchedTokenPrices }),
          );
          payload.tokenPrices = fetchedTokenPrices;
        }
      } catch (e) {
        captureException(
          `Failed to fetch token prices in useGetTokenPrices - ${e}`,
        );
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
