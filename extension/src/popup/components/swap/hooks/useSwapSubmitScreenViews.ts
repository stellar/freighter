import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import { ActionStatus } from "@shared/api/types";
import { emitScreenViewed } from "helpers/metrics";
import { SwapSource } from "popup/constants/swap";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { swapSourceProps } from "popup/metrics/swap";

/**
 * Emits the swap's `swap_processing` and `swap_success` screen views as its
 * submission advances. They are states of the submitting screen rather than
 * steps, so whichever flow hosts the swap (the Swap view, or the swap sheet
 * inside Earn) reports them through this hook, tagged with where the swap was
 * opened from.
 *
 * Each emits once per submission; the guards reset on IDLE and on ERROR, so a
 * retry after a failure re-emits.
 */
export const useSwapSubmitScreenViews = (swapSource: SwapSource | null) => {
  const { submitStatus } = useSelector(transactionSubmissionSelector);
  const hasEmittedProcessing = useRef(false);
  const hasEmittedSuccess = useRef(false);
  // The submission status lives in the store, so it outlives the host. A mount
  // that finds a stale terminal status would report a stage the user never
  // reached, so wait until the status has been seen idle. Both hosts reset the
  // submission on mount, which guarantees that happens.
  const hasSeenIdle = useRef(false);

  useEffect(() => {
    if (!hasSeenIdle.current && submitStatus !== ActionStatus.IDLE) {
      return;
    }
    if (submitStatus === ActionStatus.PENDING) {
      if (!hasEmittedProcessing.current) {
        hasEmittedProcessing.current = true;
        emitScreenViewed("swap_processing", {
          flow: "swap",
          step: "processing",
          ...swapSourceProps(swapSource),
        });
      }
    } else if (submitStatus === ActionStatus.SUCCESS) {
      if (!hasEmittedSuccess.current) {
        hasEmittedSuccess.current = true;
        emitScreenViewed("swap_success", {
          flow: "swap",
          step: "success",
          ...swapSourceProps(swapSource),
        });
      }
    } else if (
      submitStatus === ActionStatus.IDLE ||
      submitStatus === ActionStatus.ERROR
    ) {
      hasSeenIdle.current = true;
      hasEmittedProcessing.current = false;
      hasEmittedSuccess.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitStatus]);
};
