import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { ErrorMessage } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";
import { initialState, isError, reducer } from "helpers/request";
import { isMainnet } from "helpers/stellar";
import {
  trackEarnDepositCompleted,
  trackEarnDepositFailed,
} from "popup/metrics/earn";
import { getFailureReasonCode } from "popup/components/earn/helpers/failureReasonCode";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import {
  signFreighterSorobanTransaction,
  submitFreighterSorobanTransaction,
  transactionSubmissionSelector,
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
 * Hardware wallets skip the in-page signing step because they have already
 * signed: EarnReview's Confirm dispatches `startHwSign`, and HardwareSign writes
 * the signed envelope back over `transactionSimulation.preparedTransaction`
 * before the flow steps here. Only the envelope needs signing — the deposit's
 * auth carries source-account credentials, so there is no auth-entry round trip.
 *
 * That signed envelope is read from redux rather than from the `xdr` prop, the
 * same way the shared `useSubmitTxData` does it: it is the value the hardware
 * overlay actually wrote, and reading it here cannot go stale.
 *
 * Emits this step's outcome — completed or failed — rather than leaving failures
 * to the Earn view's `submitStatus: ERROR` effect. Close is offered while the
 * deposit is in flight, and it navigates back to the account view rather than
 * closing the popup: the view unmounts but this continuation keeps running, so an
 * outcome emitted from the view would be reported for successes and silently lost
 * for failures. Emitted here, both survive.
 *
 * The Earn view's effect still owns failures that happen before the flow reaches
 * this screen (a device-rejected signature at review) and still owns the UI
 * response to a failure; it skips its own emit while this step is active.
 */
export function useSubmitEarnTxData({
  isHardwareWallet,
  networkDetails,
  publicKey,
  xdr,
  assetCode,
  poolId,
  apy,
  viaSwap,
}: {
  isHardwareWallet: boolean;
  networkDetails: NetworkDetails;
  publicKey: string;
  xdr: string;
  assetCode: string;
  poolId: string;
  apy: number | null;
  viaSwap: boolean;
}) {
  const reduxDispatch = useDispatch<AppDispatch>();
  const { transactionSimulation } = useSelector(transactionSubmissionSelector);
  const [state, dispatch] = useReducer(
    reducer<SubmitEarnTxData, unknown>,
    initialState,
  );
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: false,
  });

  const trackDepositFailed = (error: ErrorMessage | undefined) =>
    trackEarnDepositFailed({
      assetCode,
      poolId,
      reasonCode: getFailureReasonCode(error),
    });

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      let signedXDR = transactionSimulation.preparedTransaction || xdr;

      if (!isHardwareWallet) {
        const res = await reduxDispatch(
          signFreighterSorobanTransaction({
            transactionXDR: xdr,
            network: networkDetails.networkPassphrase,
          }),
        );

        if (
          !signFreighterSorobanTransaction.fulfilled.match(res) ||
          !res.payload.signedTransaction
        ) {
          // Submitting `xdr` unsigned would fail on the network anyway, but as a
          // *second* failure: the rejected sign thunk has already set
          // submitStatus to ERROR and the flow has already stepped back to the
          // amount screen, so the late submit rejection would report a second
          // earn.deposit_failed for one attempt.
          trackDepositFailed(
            signFreighterSorobanTransaction.rejected.match(res)
              ? res.payload
              : undefined,
          );
          dispatch({ type: "FETCH_DATA_ERROR", payload: res.payload });
          return res.payload;
        }

        signedXDR = res.payload.signedTransaction;
      }

      const submitResp = await reduxDispatch(
        submitFreighterSorobanTransaction({
          publicKey,
          signedXDR,
          networkDetails,
        }),
      );

      if (!submitFreighterSorobanTransaction.fulfilled.match(submitResp)) {
        trackDepositFailed(
          submitFreighterSorobanTransaction.rejected.match(submitResp)
            ? submitResp.payload
            : undefined,
        );
        dispatch({ type: "FETCH_DATA_ERROR", payload: submitResp.payload });
        return submitResp.payload;
      }

      trackEarnDepositCompleted({
        assetCode,
        poolId,
        apy,
        viaSwap,
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
