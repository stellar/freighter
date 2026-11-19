import React, { useEffect, useState } from "react";
import { Icon, IconButton } from "@stellar/design-system";
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
import {
  DEFAULT_AMOUNT,
  DEFAULT_AMOUNT_USD,
} from "popup/components/amount/constants";
import { InputType } from "helpers/transaction";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAssetFromCanonical } from "helpers/stellar";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import { SwapAsset } from "popup/components/swap/SwapAsset";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { useSwapSubmitQuoteExpiry } from "popup/components/swap/hooks/useSwapSubmitQuoteExpiry";
import { useSwapSubmitScreenViews } from "popup/components/swap/hooks/useSwapSubmitScreenViews";
import { STEPS, SwapSource } from "popup/constants/swap";
import { SWAP_SCREEN_BY_STEP, swapSourceProps } from "popup/metrics/swap";
import { useStepScreenViews } from "popup/helpers/useStepScreenViews";
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
  saveSwapSource,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

import "./styles.scss";

interface EarnSwapProps {
  /** Canonical of the token the swap starts from; the user can change it. */
  sourceAsset: string;
  /** Canonical of the token the user needs, pinned as the receive side. */
  destinationAsset: string;
  destinationTokenDetails: DestinationTokenDetails | null;
  /** Swap settled — return to the token picker with a toast. */
  onDone: (received: {
    fromCode: string;
    toCode: string;
    /** The quoted amount received, unformatted. */
    toAmount: string;
  }) => void;
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
  sourceAsset,
  destinationAsset,
  destinationTokenDetails,
  onDone,
  onCancel,
}: EarnSwapProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const submission = useSelector(transactionSubmissionSelector);
  const { transactionSimulation, transactionData } = submission;

  const [activeStep, setActiveStep] = useState(STEPS.AMOUNT);
  const [inputType, setInputType] = useState<InputType>("crypto");
  // The steps fetch in their own mount effects, and React runs a child's
  // effects before its parent's, so they render only once the seed below has
  // reached Redux, as on the Swap route. Otherwise the first fetch would read
  // the submission as it was before the seed.
  const [isSeeded, setIsSeeded] = useState(false);

  const { isQuoteExpiredAtSubmit } = useSwapSubmitQuoteExpiry({
    onRecover: () => setActiveStep(STEPS.AMOUNT),
  });

  // The same screen views the Swap route reports, from the same table, tagged
  // as opened from Earn: one per step the user reaches, then processing and
  // success as the submission advances. The submitting step reports only
  // those two, as on the Swap route.
  useStepScreenViews(
    activeStep,
    SWAP_SCREEN_BY_STEP,
    swapSourceProps(SwapSource.Earn),
  );
  useSwapSubmitScreenViews(SwapSource.Earn);

  // Seed the swap: the source the caller picked (see pickSwapSource), the
  // destination pinned to what the deposit needs. Runs once on entry —
  // re-running would stomp a source the user has since chosen.
  useEffect(() => {
    dispatch(resetSubmission());
    dispatch(resetSimulation());
    dispatch(saveAsset(sourceAsset));
    dispatch(saveIsToken(false));
    dispatch(saveAmount(DEFAULT_AMOUNT));
    dispatch(saveAmountUsd(DEFAULT_AMOUNT_USD));
    dispatch(saveDestinationAsset(destinationAsset));
    dispatch(saveDestinationTokenDetails(destinationTokenDetails));
    // Tags the swap's own events (confirm, quote expiry, outcome) as Earn's.
    dispatch(saveSwapSource(SwapSource.Earn));
    setIsSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    const fromCode = getAssetFromCanonical(transactionData.asset).code;
    const toCode = getAssetFromCanonical(transactionData.destinationAsset).code;
    const toAmount = transactionData.destinationAmount;
    dispatch(resetSubmission());
    dispatch(resetSimulation());
    onDone({ fromCode, toCode, toAmount });
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
      case STEPS.SWAP_CONFIRM: {
        // The recovery effect steps back to the amount screen on a quote-expiry
        // failure; render nothing this frame so SubmitFail never flashes.
        if (isQuoteExpiredAtSubmit) {
          return null;
        }
        return (
          <TransactionConfirm
            xdr={transactionSimulation.preparedTransaction!}
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            // Both exits stay inside Earn: Done returns to the picker with the
            // new balance, Close backs out without abandoning the deposit.
            onDone={finish}
            onClose={onCancel}
            onDismissError={onCancel}
          />
        );
      }

      case STEPS.SET_FROM_ASSET: {
        return (
          <SwapAsset
            selectionType="source"
            hiddenAssets={[destinationAsset]}
            // A real step back to the amount sheet, so an arrow rather than the
            // X the standalone Swap route uses — the sheet owns the X.
            backIcon={<Icon.ArrowLeft />}
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            onClickAsset={(canonical: string, isContract: boolean) => {
              dispatch(saveAsset(canonical));
              dispatch(saveIsToken(isContract));
              dispatch(saveAmount("0"));
              dispatch(saveAmountUsd("0.00"));
              emitMetric(METRIC_NAMES.swapSourceSelected, {
                asset_code: getAssetFromCanonical(canonical).code,
                asset_issuer: getAssetFromCanonical(canonical).issuer,
                list: "balances",
                ...swapSourceProps(SwapSource.Earn),
              });
              setActiveStep(STEPS.AMOUNT);
            }}
          />
        );
      }

      case STEPS.AMOUNT:
      default: {
        return (
          <SwapAmount
            inputType={inputType}
            setInputType={setInputType}
            isDestinationLocked
            // No back button in the header: the sheet's X, at the top right,
            // dismisses the whole branch.
            isSheetLayout
            goBack={onCancel}
            goToEditSrc={() => setActiveStep(STEPS.SET_FROM_ASSET)}
            // Unreachable while the destination is pinned — the receive pill is
            // a label, not a control — but the prop is required; point it at the
            // source picker rather than leaving a silent no-op behind.
            goToEditDst={() => setActiveStep(STEPS.SET_FROM_ASSET)}
            goToNext={() => setActiveStep(STEPS.SWAP_CONFIRM)}
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
        // While the swap is submitting or done, the sheet hugs that status, as
        // the design draws it (4478:117063, 4478:117082); the loading, failure
        // and password screens keep the steps' height they're laid out for.
        className={`EarnSwapSheet${
          activeStep === STEPS.SWAP_CONFIRM &&
          (submission.submitStatus === ActionStatus.PENDING ||
            submission.submitStatus === ActionStatus.SUCCESS)
            ? " EarnSwapSheet--status"
            : ""
        }`}
        // The amount screen focuses its own input; letting radix focus the
        // first tabbable element would steal that.
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
        data-testid="earn-swap-sheet"
      >
        <ScreenReaderOnly>
          <SheetTitle>{t("Swap")}</SheetTitle>
        </ScreenReaderOnly>
        {/* The sheet's X, always at the top right: on the amount step, and on
            the submitting/success step, which has no header of its own. The
            source picker steps back with its arrow instead. What the X *means*
            is not the same on every step — see `dismiss`. */}
        {activeStep !== STEPS.SET_FROM_ASSET && (
          <div className="EarnSwapSheet__close">
            <IconButton
              type="button"
              icon={<Icon.X />}
              altText={t("Close")}
              aria-label={t("Close")}
              // The design's 24px X in Text/Primary.
              customSize="1.5rem"
              customColor="var(--sds-clr-gray-12)"
              onClick={dismiss}
              data-testid="earn-swap-close"
            />
          </div>
        )}
        <div className="EarnSwapSheet__body">
          {isSeeded ? renderStep() : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};
