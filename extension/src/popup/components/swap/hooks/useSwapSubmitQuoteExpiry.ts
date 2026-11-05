import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { ActionStatus } from "@shared/api/types";
import { AppDispatch } from "popup/App";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAssetFromCanonical } from "helpers/stellar";
import { getQuoteExpiredOperationCodes } from "popup/helpers/quoteExpiry";
import {
  resetSubmitStatus,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

/**
 * Recovers from a quote that expired between review and submit
 * (op_under_dest_min / op_too_few_offers) by returning to the amount screen
 * with a fresh quote, instead of dead-ending in SubmitFail.
 *
 * Extracted from the Swap route so the Earn flow's embedded swap gets the same
 * recovery — a swap that dead-ends there would strand the user mid-deposit. Both
 * callers host the swap steps rather than being SwapAmount itself, which is why
 * this sits beside the swap components rather than inside one of them.
 *
 * Returns `isQuoteExpiredAtSubmit` so the caller can render nothing on the
 * frame the recovery runs, keeping SubmitFail from flashing before the step
 * changes.
 */
export const useSwapSubmitQuoteExpiry = ({
  onRecover,
}: {
  onRecover: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const submission = useSelector(transactionSubmissionSelector);
  const { transactionData } = submission;

  const isQuoteExpiredAtSubmit =
    submission.submitStatus === ActionStatus.ERROR &&
    submission.isSwapQuoteExpired;

  useEffect(() => {
    if (!isQuoteExpiredAtSubmit) {
      return;
    }
    // Amounts intentionally dropped (parity with swap.completed/failed, which
    // carry no amounts). Assets are bare codes (getAssetFromCanonical) so
    // from_asset_code/to_asset_code match mobile rather than being canonical ids.
    emitMetric(METRIC_NAMES.swapQuoteExpired, {
      from_asset_code: getAssetFromCanonical(transactionData.asset).code,
      to_asset_code: getAssetFromCanonical(transactionData.destinationAsset)
        .code,
      result_code: getQuoteExpiredOperationCodes(submission.error).join(", "),
    });
    // Clear only the ERROR status (keep the transaction data + the
    // isSwapQuoteExpired flag, which drives the amount-screen notification).
    dispatch(resetSubmitStatus());
    onRecover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuoteExpiredAtSubmit]);

  return { isQuoteExpiredAtSubmit };
};
