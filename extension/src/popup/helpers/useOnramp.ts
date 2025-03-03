import { useEffect, useState } from "react";
import { captureException } from "@sentry/browser";

import { RequestState } from "helpers/hooks/useGetOnrampToken";
import { openTab } from "./navigate";

interface OnrampParams {
  onrampTokenState: any;
  asset: string;
}

interface GetCoinBaseUrlParams {
  token: string;
  asset: string;
}

const getCoinbaseUrl = ({ token, asset }: GetCoinBaseUrlParams) =>
  `https://pay.coinbase.com/buy/select-asset?sessionToken=${token}&defaultExperience=buy&defaultAsset=${asset}`;

export const useOnramp = ({ onrampTokenState, asset }: OnrampParams) => {
  const [tokenError, setTokenError] = useState("");

  useEffect(() => {
    if (onrampTokenState.state === RequestState.ERROR) {
      setTokenError("Unable to communicate with Coinbase");
      captureException("Unable to fetch Coinbase session token");
    }

    if (
      onrampTokenState.state === RequestState.SUCCESS &&
      onrampTokenState.data.token
    ) {
      const token = onrampTokenState.data.token;

      setTokenError("");
      captureException("Unable to fetch Coinbase session token");
      const coinbaseUrl = getCoinbaseUrl({ token, asset });

      openTab(coinbaseUrl);
    }
  }, [onrampTokenState, asset]);

  return { tokenError };
};
