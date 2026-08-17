import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { AppDispatch } from "popup/App";
import { EARN_SWAP_STEPS } from "popup/constants/earn";
import { InputType } from "helpers/transaction";
import { emitMetric, emitScreenViewed } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAssetFromCanonical } from "helpers/stellar";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import { SwapAsset } from "popup/components/swap/SwapAsset";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { useSwapSubmitQuoteExpiry } from "popup/components/swap/SwapAmount/hooks/useSwapSubmitQuoteExpiry";
import { resetSimulation } from "popup/ducks/token-payment";
import {
  DestinationTokenDetails,
  resetSubmission,
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveDestinationAsset,
  saveDestinationTokenDetails,
  saveIsToken,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

interface EarnSwapProps {
  /** Canonical of the token the user needs, pinned as the receive side. */
  destinationAsset: string;
  destinationTokenDetails: DestinationTokenDetails | null;
  /** Swap settled — return to the token picker with a toast. */
  onDone: (received: { fromCode: string; toCode: string }) => void;
  /** Backed out without swapping. */
  onCancel: () => void;
}

/**
 * The swap branch of the Earn flow: a sibling of the Swap route rather than a
 * modification of it.
 *
 * Owns its own sub-step state so the token picker underneath stays mounted, and
 * so the sub-state resets for free when the branch unmounts. The receive side is
 * pinned to the token the deposit needs — the whole point of entering here.
 *
 * Not rendered inside a SlideupModal: those self-measure via scrollHeight, which
 * breaks for full-height screens using View.Content's footer.
 */
export const EarnSwap = ({
  destinationAsset,
  destinationTokenDetails,
  onDone,
  onCancel,
}: EarnSwapProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const submission = useSelector(transactionSubmissionSelector);
  const { transactionSimulation, transactionData } = submission;

  const [activeStep, setActiveStep] = useState(EARN_SWAP_STEPS.AMOUNT);
  const [inputType, setInputType] = useState<InputType>("crypto");

  const { isQuoteExpiredAtSubmit } = useSwapSubmitQuoteExpiry({
    onRecover: () => setActiveStep(EARN_SWAP_STEPS.AMOUNT),
  });

  // Seed the swap: source defaults to XLM (the most common), destination is
  // pinned to what the deposit needs. Runs once on entry — re-running would
  // stomp a source the user has since chosen.
  useEffect(() => {
    dispatch(resetSubmission());
    dispatch(resetSimulation());
    dispatch(saveAsset("native"));
    dispatch(saveIsToken(false));
    dispatch(saveAmount("0"));
    dispatch(saveAmountUsd("0.00"));
    dispatch(saveDestinationAsset(destinationAsset));
    dispatch(saveDestinationTokenDetails(destinationTokenDetails));
    emitScreenViewed("earn_swap_amount", { flow: "earn" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    const fromCode = getAssetFromCanonical(transactionData.asset).code;
    const toCode = getAssetFromCanonical(transactionData.destinationAsset).code;
    dispatch(resetSubmission());
    dispatch(resetSimulation());
    onDone({ fromCode, toCode });
  };

  switch (activeStep) {
    case EARN_SWAP_STEPS.SWAP_CONFIRM: {
      // The recovery effect steps back to the amount screen on a quote-expiry
      // failure; render nothing this frame so SubmitFail never flashes.
      if (isQuoteExpiredAtSubmit) {
        return null;
      }
      return (
        <TransactionConfirm
          xdr={transactionSimulation.preparedTransaction!}
          goBack={() => setActiveStep(EARN_SWAP_STEPS.AMOUNT)}
          // Both exits stay inside Earn: Done returns to the picker with the
          // new balance, Close backs out without abandoning the deposit.
          onDone={finish}
          onClose={onCancel}
          onDismissError={onCancel}
        />
      );
    }

    case EARN_SWAP_STEPS.SET_FROM_ASSET: {
      return (
        <SwapAsset
          selectionType="source"
          hiddenAssets={[destinationAsset]}
          goBack={() => setActiveStep(EARN_SWAP_STEPS.AMOUNT)}
          onClickAsset={(canonical: string, isContract: boolean) => {
            dispatch(saveAsset(canonical));
            dispatch(saveIsToken(isContract));
            dispatch(saveAmount("0"));
            dispatch(saveAmountUsd("0.00"));
            emitMetric(METRIC_NAMES.swapSourceSelected, {
              asset_code: getAssetFromCanonical(canonical).code,
              asset_issuer: getAssetFromCanonical(canonical).issuer,
              source: "balances",
            });
            setActiveStep(EARN_SWAP_STEPS.AMOUNT);
          }}
        />
      );
    }

    case EARN_SWAP_STEPS.AMOUNT:
    default: {
      return (
        <SwapAmount
          inputType={inputType}
          setInputType={setInputType}
          isDestinationLocked
          goBack={onCancel}
          goToEditSrc={() => setActiveStep(EARN_SWAP_STEPS.SET_FROM_ASSET)}
          // Unreachable while the destination is locked, but the prop is
          // required; point it at the source picker rather than leaving a
          // no-op that would silently swallow a future unlock.
          goToEditDst={() => setActiveStep(EARN_SWAP_STEPS.SET_FROM_ASSET)}
          goToNext={() => setActiveStep(EARN_SWAP_STEPS.SWAP_CONFIRM)}
        />
      );
    }
  }
};
