import { useReducer } from "react";
import { useDispatch } from "react-redux";
import { captureException } from "@sentry/browser";

import { initialState, reducer, isError } from "helpers/request";
import { AppDispatch } from "popup/App";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
} from "popup/ducks/transactionSubmission";
import { NetworkDetails } from "@shared/constants/stellar";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { isMainnet } from "helpers/stellar";

export interface ChangeTrustData {
  status: "success" | "error";
  txHash?: string;
  error?: string;
}

function useGetChangeTrust() {
  const [state, dispatch] = useReducer(
    reducer<ChangeTrustData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: false,
  });

  const fetchData = async ({
    publicKey,
    xdr,
    networkDetails,
  }: {
    publicKey: string;
    xdr: string;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const payload = {} as ChangeTrustData;

      const res = await reduxDispatch(
        signFreighterTransaction({
          transactionXDR: xdr,
          network: networkDetails.networkPassphrase,
        }),
      );

      if (signFreighterTransaction.rejected.match(res)) {
        throw new Error("failed to sign transaction");
      }

      if (signFreighterTransaction.fulfilled.match(res)) {
        const submitResp = await reduxDispatch(
          submitFreighterTransaction({
            publicKey,
            signedXDR: res.payload.signedTransaction,
            networkDetails,
          }),
        );

        if (submitFreighterTransaction.rejected.match(submitResp)) {
          throw new Error("failed to submit transaction");
        }

        if (submitFreighterTransaction.fulfilled.match(submitResp)) {
          payload.status = "success";
          payload.txHash = submitResp.payload.hash;

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
              `Failed to fetch balances after change trust tx submission - ${JSON.stringify(
                balancesResult.message,
              )} ${networkDetails.network}`,
            );
          }
        }
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      dispatch({
        type: "FETCH_DATA_ERROR",
        payload: { status: "error", error: errorMessage },
      });

      return { status: "error", error: errorMessage } as ChangeTrustData;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetChangeTrust };
