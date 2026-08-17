import { useReducer } from "react";
import { useDispatch } from "react-redux";
import { captureException } from "@sentry/browser";

import { NetworkDetails } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";
import { initialState, isError, reducer } from "helpers/request";
import { emitMetric } from "helpers/metrics";
import { isMainnet } from "helpers/stellar";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  signFreighterSorobanTransaction,
  submitFreighterSorobanTransaction,
} from "popup/ducks/transactionSubmission";

interface SubmitEarnTxData {
  status: "success";
}

/**
 * Signs and submits the prepared Blend deposit.
 *
 * Deliberately not the shared `useSubmitTxData`: that one signs and submits via
 * the *classic* thunks, and it registers the destination as a recent address —
 * which for a deposit is the pool contract, not somewhere anyone sends funds.
 *
 * Hardware wallets skip the in-page signing step; the prepared XDR is already
 * signed by the time this runs (the deposit's auth carries source-account
 * credentials, so the envelope signature covers it — no auth-entry round trip).
 */
export function useSubmitEarnTxData({
  isHardwareWallet,
  networkDetails,
  publicKey,
  xdr,
  assetCode,
}: {
  isHardwareWallet: boolean;
  networkDetails: NetworkDetails;
  publicKey: string;
  xdr: string;
  assetCode: string;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<SubmitEarnTxData, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: false,
  });

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      let signedXDR = xdr;

      if (!isHardwareWallet) {
        const res = await reduxDispatch(
          signFreighterSorobanTransaction({
            transactionXDR: xdr,
            network: networkDetails.networkPassphrase,
          }),
        );

        if (
          signFreighterSorobanTransaction.fulfilled.match(res) &&
          res.payload.signedTransaction
        ) {
          signedXDR = res.payload.signedTransaction;
        }
      }

      const submitResp = await reduxDispatch(
        submitFreighterSorobanTransaction({
          publicKey,
          signedXDR,
          networkDetails,
        }),
      );

      if (submitFreighterSorobanTransaction.fulfilled.match(submitResp)) {
        emitMetric(METRIC_NAMES.earnDepositCompleted, {
          asset_code: assetCode,
        });

        // The deposit moved funds out of the account, so refresh balances. A
        // failure here does not affect the deposit itself — log and move on
        // rather than reporting a successful submission as an error.
        const balancesResult = await fetchBalances(
          publicKey,
          isMainnet(networkDetails),
          networkDetails,
          false,
        );

        if (isError<AccountBalances>(balancesResult)) {
          captureException(
            `Failed to fetch balances after earn deposit - ${JSON.stringify(
              balancesResult.message,
            )} ${networkDetails.network}`,
          );
        }
      }

      const payload: SubmitEarnTxData = { status: "success" };
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return { state, fetchData };
}
