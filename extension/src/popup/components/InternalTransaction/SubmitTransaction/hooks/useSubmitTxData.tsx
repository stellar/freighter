import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { initialState, reducer, isError } from "helpers/request";
import { AppDispatch } from "popup/App";
import {
  addRecentAddress,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { NetworkDetails } from "@shared/constants/stellar";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { AssetIcons } from "@shared/api/types";

interface SubmitTxData {
  status: "success" | "error";
  icons: AssetIcons;
  error?: string;
}

function useSubmitTxData({
  isHardwareWallet,
  networkDetails,
  publicKey,
  xdr,
}: {
  isHardwareWallet: boolean;
  networkDetails: NetworkDetails;
  publicKey: string;
  xdr: string;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const [state, dispatch] = useReducer(
    reducer<SubmitTxData, unknown>,
    initialState,
  );
  const submission = useSelector(transactionSubmissionSelector);
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: false,
  });

  const {
    transactionData: { asset, destination, federationAddress },
    transactionSimulation,
  } = submission;
  const sourceAsset = getAssetFromCanonical(asset);

  const fetchData = async ({ isSwap }: { isSwap: boolean }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = {
        status: "success",
      } as SubmitTxData;

      let signedXDR = transactionSimulation.preparedTransaction!;
      if (!isHardwareWallet) {
        const res = await reduxDispatch(
          signFreighterTransaction({
            transactionXDR: xdr,
            network: networkDetails.networkPassphrase,
          }),
        );
        if (
          signFreighterTransaction.fulfilled.match(res) &&
          res.payload.signedTransaction
        ) {
          signedXDR = res.payload.signedTransaction;
        }
      }

      const submitResp = await reduxDispatch(
        submitFreighterTransaction({
          publicKey,
          signedXDR,
          networkDetails,
        }),
      );

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        if (!isSwap) {
          await reduxDispatch(
            addRecentAddress({ address: federationAddress || destination }),
          );
        }
        emitMetric(METRIC_NAMES.sendPaymentSuccess, {
          sourceAsset: sourceAsset.code,
        });

        // After successful submission, re-fetch balances and collectibles to get their latest values

        const balancesResult = await fetchBalances(
          publicKey,
          isMainnet(networkDetails),
          networkDetails,
          false,
        );

        if (isError<AccountBalances>(balancesResult)) {
          // we don't want to throw an error if balances fail to fetch as this doesn't affect the tx submission
          // let's simply log the error and continue - the user will need to refresh the Account page or wait for polling to refresh the balances
          captureException(
            `Failed to fetch balances after ${isSwap ? "swap" : "send"} tx submission - ${JSON.stringify(
              balancesResult.message,
            )} ${networkDetails.network}`,
          );
        }
      }

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

export { useSubmitTxData };
