import { useReducer } from "react";
import BigNumber from "bignumber.js";

import { initialState, reducer } from "helpers/request";
import { NetworkDetails } from "@shared/constants/stellar";
import { isMainnet } from "helpers/stellar";
import { getTokenPrices } from "@shared/api/internal";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";

interface SendPriceData {
  assetValue: string | null;
  assetValueUsd: string | null;
}

function useGetSendPriceData({ assetId }: { assetId: string }) {
  const [state, dispatch] = useReducer(
    reducer<SendPriceData, unknown>,
    initialState,
  );

  const fetchData = async ({
    assetAmount,
    assetDecimals,
    inputType,
    networkDetails,
  }: {
    assetAmount: string;
    assetDecimals: number;
    inputType: "crypto" | "fiat";
    networkDetails: NetworkDetails;
  }): Promise<SendPriceData | { error: string }> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = { assetValue: null } as SendPriceData;
      const isMainnetNetwork = isMainnet(networkDetails);

      if (isMainnetNetwork) {
        try {
          const prices = await getTokenPrices([assetId]);
          const assetPrice = prices[assetId]?.currentPrice;
          if (assetPrice) {
            payload.assetValue =
              inputType === "crypto"
                ? `${formatAmount(
                    roundUsdValue(
                      new BigNumber(assetPrice)
                        .multipliedBy(new BigNumber(assetAmount))
                        .toString(),
                    ),
                  )}`
                : new BigNumber(assetAmount)
                    .dividedBy(new BigNumber(assetPrice))
                    .decimalPlaces(assetDecimals)
                    .toString();
          }
        } catch (e) {
          payload.assetValue = null;
        }
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      const _err = typeof error === "string" ? error : JSON.stringify(error);
      return { error: _err };
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetSendPriceData };
