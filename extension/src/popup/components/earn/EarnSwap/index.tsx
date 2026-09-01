import React, { useEffect, useState } from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { ActionStatus } from "@shared/api/types";
import { AppDispatch } from "popup/App";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  ScreenReaderOnly,
} from "popup/basics/shadcn/Sheet";
import { EARN_SWAP_STEPS } from "popup/constants/earn";
import {
  DEFAULT_AMOUNT,
  DEFAULT_AMOUNT_USD,
} from "popup/components/amount/constants";
import { InputType } from "helpers/transaction";
import { emitMetric, emitScreenViewed } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAssetFromCanonical } from "helpers/stellar";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import { SwapAsset } from "popup/components/swap/SwapAsset";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { useSwapSubmitQuoteExpiry } from "popup/components/swap/hooks/useSwapSubmitQuoteExpiry";
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

import "./styles.scss";

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
 * pinned to the token the deposit needs — chosen on the picker, the whole point
 * of entering here — so only the sell side has a picker.
 *
 * Presented as a bottom sheet over the still-visible token picker, per the
 * design. Not a SlideupModal: those self-measure via scrollHeight, which breaks
 * for the full-height Views this branch reuses from the Swap route. The radix
 * sheet takes an explicit height instead, and `.EarnSwapSheet` re-bases those
 * Views from 100dvh onto the sheet.
 */
export const EarnSwap = ({
  destinationAsset,
  destinationTokenDetails,
  onDone,
  onCancel,
}: EarnSwapProps) => {
  const { t } = useTranslation();
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
    dispatch(saveAmount(DEFAULT_AMOUNT));
    dispatch(saveAmountUsd(DEFAULT_AMOUNT_USD));
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

  // The sheet's X, its scrim and Escape are shared by every step, but the steps
  // do not all mean the same thing by a dismissal. Once the swap has succeeded
  // it is a completion, not a cancellation: the balance behind the sheet has
  // changed, and routing it to `onCancel` drops the picker's refresh, the
  // completion metric and the `via_swap` attribution on the floor, leaving the
  // picker offering a token at the balance it had before the swap.
  const dismiss = () => {
    if (submission.submitStatus === ActionStatus.SUCCESS) {
      finish();
      return;
    }
    onCancel();
  };

  const renderStep = () => {
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
            // A real step back to the amount sheet, so an arrow rather than the
            // X the standalone Swap route uses — the sheet owns the X.
            backIcon={<Icon.ArrowLeft />}
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
            // In the sheet the X dismisses the whole branch, so the header's
            // left slot carries the settings control instead of a back button.
            isSheetLayout
            goBack={onCancel}
            goToEditSrc={() => setActiveStep(EARN_SWAP_STEPS.SET_FROM_ASSET)}
            // Unreachable while the destination is pinned — the receive pill is
            // a label, not a control — but the prop is required; point it at the
            // source picker rather than leaving a silent no-op behind.
            goToEditDst={() => setActiveStep(EARN_SWAP_STEPS.SET_FROM_ASSET)}
            goToNext={() => setActiveStep(EARN_SWAP_STEPS.SWAP_CONFIRM)}
          />
        );
      }
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          dismiss();
        }
      }}
    >
      <SheetContent
        side="bottom"
        // `className` is forwarded to the overlay as well as the content by our
        // shadcn wrapper, so `.EarnSwapSheet` styles are scoped by data-slot —
        // the overlay has to keep its dim scrim so the picker shows through.
        className="EarnSwapSheet"
        // The amount screen focuses its own input; letting radix focus the
        // first tabbable element would steal that.
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
        data-testid="earn-swap-sheet"
      >
        <ScreenReaderOnly>
          <SheetTitle>{t("Swap")}</SheetTitle>
        </ScreenReaderOnly>
        {/* Sheet-level rather than per-step: the submitting/success step has no
            header of its own. What the X *means* is not the same on every step
            though — see `dismiss`. */}
        <button
          type="button"
          className="EarnSwapSheet__close"
          onClick={dismiss}
          aria-label={t("Close")}
          data-testid="earn-swap-close"
        >
          <Icon.XClose />
        </button>
        <div className="EarnSwapSheet__body">{renderStep()}</div>
      </SheetContent>
    </Sheet>
  );
};
