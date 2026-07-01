import React, { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Notification } from "@stellar/design-system";

import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

interface UseSwapQuoteExpiryParams {
  /** In-screen expiry flagged by the simulate hook (op_under_dest_min / op_too_few_offers). */
  isQuoteExpired: boolean;
  /** Redux flag set when a quote expired at submit time and routed back here. */
  isSwapQuoteExpired: boolean;
  asset: string;
  destinationAsset: string;
  amount: string;
  destinationAmount: string;
  allowedSlippage: string;
}

/**
 * Surfaces the "quote has expired" toast + metric. Two triggers dedupe into one
 * sonner toast via a stable id: the in-screen simulate flag (also emits the
 * swapQuoteExpired metric) and the submit-recovery redux flag.
 */
export const useSwapQuoteExpiry = ({
  isQuoteExpired,
  isSwapQuoteExpired,
  asset,
  destinationAsset,
  amount,
  destinationAmount,
  allowedSlippage,
}: UseSwapQuoteExpiryParams) => {
  const { t } = useTranslation();

  // A transient, swipe-/auto-dismissible toast (sonner) rather than a fixed
  // banner that takes layout space. The stable id dedupes the in-screen
  // (isQuoteExpired) and submit-recovery (isSwapQuoteExpired) triggers into one
  // toast instead of stacking two.
  const showQuoteExpiredToast = useCallback(
    () =>
      toast.custom(
        () => (
          <Notification
            variant="error"
            title={t("Quote has expired, please try again to get a new quote")}
          />
        ),
        { id: "swap-quote-expired" },
      ),
    [t],
  );

  // Quote-expired surfacing: when the simulate hook flags an expired quote
  // (Horizon op_under_dest_min / op_too_few_offers), emit the metric and show
  // the user-facing toast. The auto-refetch is handled by getBestPath's retry
  // logic; this only emits + surfaces the message.
  useEffect(() => {
    if (!isQuoteExpired) {
      return;
    }
    showQuoteExpiredToast();
    emitMetric(METRIC_NAMES.swapQuoteExpired, {
      sourceToken: asset,
      destToken: destinationAsset,
      sourceAmount: amount,
      destAmount: destinationAmount,
      allowedSlippage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuoteExpired]);

  // A quote that expired at submit time (Redux flag) routes back to this screen;
  // surface the same toast on arrival.
  useEffect(() => {
    if (isSwapQuoteExpired) {
      showQuoteExpiredToast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwapQuoteExpired]);
};
