import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { initialState, isError, reducer } from "helpers/request";
import { AppDispatch } from "popup/App";
import {
  addRecentAddress,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { NetworkDetails } from "@shared/constants/stellar";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
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
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: true,
  });
  const submission = useSelector(transactionSubmissionSelector);
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

      const isMainnetNetwork = isMainnet(networkDetails);
      const balances = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
        true,
      );

      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }
      payload.icons = balances.icons || {};

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
