import { useEffect, useReducer, useState } from "react";
import { captureException } from "@sentry/browser";

import { INDEXER_URL } from "@shared/constants/mercury";
import { openTab } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { RequestState, initialState, reducer } from "./fetchHookInterface";
import { AppDataType, useGetAppData } from "./useGetAppData";
import { isError } from "helpers/request";

type SuccessReturnType = { token: string | null; error: string | null };

interface GetCoinBaseUrlParams {
  token: string;
  asset?: string;
}

const getCoinbaseUrl = ({ token, asset }: GetCoinBaseUrlParams) => {
  const selectedAsset = asset ? `&defaultAsset=${asset}` : "";

  return `https://pay.coinbase.com/buy/select-asset?sessionToken=${token}&defaultExperience=buy${selectedAsset}`;
};

interface UseGetOnrampTokenParams {
  asset?: string;
}

function useGetOnrampToken({ asset }: UseGetOnrampTokenParams) {
  const [state, dispatch] = useReducer(
    reducer<SuccessReturnType>,
    initialState,
  );
  const [tokenError, setTokenError] = useState("");
  const { fetchData: fetchAppData } = useGetAppData();

  useEffect(() => {
    if (state.state === RequestState.ERROR) {
      setTokenError("Unable to communicate with Coinbase");
      captureException("Unable to fetch Coinbase session token");
    }

    if (state.state === RequestState.SUCCESS && state.data.token) {
      const token = state.data.token;

      setTokenError("");
      const coinbaseUrl = getCoinbaseUrl({ token, asset });
      emitMetric(METRIC_NAMES.coinbaseOnrampOpened, { asset });

      openTab(coinbaseUrl);
    }
  }, [state, asset]);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }
      const publicKey =
        appData.type === AppDataType.RESOLVED ? appData.account.publicKey : "";
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: publicKey }),
      };
      const url = `${INDEXER_URL}/onramp/token`;
      const response = await fetch(url, options);
      const { data } = await response.json();

      if (!data.token) {
        dispatch({ type: "FETCH_DATA_ERROR", payload: data.error });
        return data.error;
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload: data });
      return data;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  const clearTokenError = () => {
    setTokenError("");
  };

  const isLoading = state.state === RequestState.LOADING;

  return {
    state,
    fetchData,
    tokenError,
    clearTokenError,
    isLoading,
  };
}

export { useGetOnrampToken, RequestState };
