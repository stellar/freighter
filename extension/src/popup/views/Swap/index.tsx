import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { ActionStatus } from "@shared/api/types";
import { STEPS } from "popup/constants/swap";
import { emitMetric } from "helpers/metrics";
import { InputType } from "helpers/transaction";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getQuoteExpiredOperationCodes } from "popup/helpers/quoteExpiry";
import { SwapAsset } from "popup/components/swap/SwapAsset";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { AppDispatch } from "popup/App";
import {
  resetSubmission,
  resetSubmitStatus,
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveDestinationAsset,
  saveDestinationTokenDetails,
  saveIsToken,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { resetSimulation } from "popup/ducks/token-payment";
import { getAssetFromCanonical } from "helpers/stellar";

const SWAP_METRIC_BY_STEP: Partial<Record<STEPS, string>> = {
  [STEPS.SWAP_CONFIRM]: METRIC_NAMES.swapConfirm,
  [STEPS.SET_DST_ASSET]: METRIC_NAMES.swapTo,
  [STEPS.AMOUNT]: METRIC_NAMES.swapAmount,
  [STEPS.CONFIRM_AMOUNT]: METRIC_NAMES.swapAmountReview,
  [STEPS.SET_FROM_ASSET]: METRIC_NAMES.swapFrom,
};

export const Swap = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(STEPS.AMOUNT);
  const lastEmittedStep = useRef<STEPS | null>(null);

  // Emit a screen-view metric only once per step transition.
  useEffect(() => {
    if (activeStep === lastEmittedStep.current) return;
    lastEmittedStep.current = activeStep;

    const metric = SWAP_METRIC_BY_STEP[activeStep];
    if (metric) {
      emitMetric(metric);
    }
  }, [activeStep]);

  const submission = useSelector(transactionSubmissionSelector);
  const { transactionSimulation, transactionData } = submission;

  // Quote expired at submit (op_under_dest_min / op_too_few_offers): recover to
  // the review screen with a fresh quote instead of dead-ending in SubmitFail.
  const isQuoteExpiredAtSubmit =
    submission.submitStatus === ActionStatus.ERROR &&
    submission.isSwapQuoteExpired;
  useEffect(() => {
    if (!isQuoteExpiredAtSubmit) {
      return;
    }
    emitMetric(METRIC_NAMES.swapQuoteExpired, {
      sourceToken: transactionData.asset,
      destToken: transactionData.destinationAsset,
      sourceAmount: transactionData.amount,
      destAmount: transactionData.destinationAmount,
      allowedSlippage: transactionData.allowedSlippage,
      resultCode: getQuoteExpiredOperationCodes(submission.error).join(", "),
    });
    // Clear only the ERROR status (keep the transaction data + the
    // isSwapQuoteExpired flag, which drives the amount-screen notification).
    dispatch(resetSubmitStatus());
    setActiveStep(STEPS.AMOUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuoteExpiredAtSubmit]);

  const [inputType, setInputType] = useState<InputType>("crypto");

  useEffect(() => {
    dispatch(resetSimulation());
    dispatch(resetSubmission());

    // Handle query params and set defaults on mount
    const params = new URLSearchParams(location.search);
    const sourceAssetParam = params.get("source_asset");
    const destinationAssetParam = params.get("destination_asset");

    // Pre-populate source asset if provided and valid, otherwise default to native
    if (sourceAssetParam) {
      try {
        getAssetFromCanonical(sourceAssetParam);
        dispatch(saveAsset(sourceAssetParam));
      } catch {
        // Invalid source asset param, use default
        dispatch(saveAsset("native"));
        dispatch(saveIsToken(false));
      }
    } else {
      // Set default asset to native if not provided
      dispatch(saveAsset("native"));
      dispatch(saveIsToken(false));
    }

    // Pre-populate destination asset if provided and valid
    if (destinationAssetParam) {
      try {
        getAssetFromCanonical(destinationAssetParam);
        dispatch(saveDestinationAsset(destinationAssetParam));
      } catch {
        // Invalid destination asset param, ignore
      }
    }
  }, [dispatch, location.search]);

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.SWAP_CONFIRM: {
        // The recovery effect transitions back to review on a quote-expiry
        // submit failure; render nothing this frame so SubmitFail never flashes.
        if (isQuoteExpiredAtSubmit) {
          return null;
        }
        return (
          <TransactionConfirm
            xdr={transactionSimulation.preparedTransaction!}
            goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
          />
        );
      }
      case STEPS.SET_DST_ASSET: {
        return (
          <SwapAsset
            selectionType="destination"
            hiddenAssets={[transactionData.asset]}
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            onClickAsset={(canonical, isContract, details) => {
              dispatch(saveDestinationAsset(canonical));
              dispatch(saveIsToken(isContract));
              dispatch(saveDestinationTokenDetails(details ?? null));
              // Can't swap a token for itself: if it matches the current
              // source, reset the source to "(+) Select".
              if (canonical === transactionData.asset) {
                dispatch(saveAsset(""));
                dispatch(saveAmount("0"));
                dispatch(saveAmountUsd("0.00"));
              }
              emitMetric(METRIC_NAMES.swapDestinationSelected, {
                tokenCode: details?.tokenCode,
                tokenIssuer: details?.issuer,
                requiresTrustline: details?.requiresTrustline,
                source: details?.source,
              });
              setActiveStep(STEPS.AMOUNT);
            }}
          />
        );
      }
      case STEPS.AMOUNT: {
        return (
          <SwapAmount
            inputType={inputType}
            setInputType={setInputType}
            goBack={() => {
              dispatch(resetSubmission());
              dispatch(resetSimulation());
              navigateTo(ROUTES.account, navigate);
            }}
            goToEditSrc={() => setActiveStep(STEPS.SET_FROM_ASSET)}
            goToEditDst={() => setActiveStep(STEPS.SET_DST_ASSET)}
            goToNext={() => setActiveStep(STEPS.SWAP_CONFIRM)}
          />
        );
      }
      case STEPS.CONFIRM_AMOUNT: {
        return (
          <SwapAmount
            inputType={inputType}
            setInputType={setInputType}
            goBack={() => setActiveStep(STEPS.SET_DST_ASSET)}
            goToEditSrc={() => setActiveStep(STEPS.SET_FROM_ASSET)}
            goToEditDst={() => setActiveStep(STEPS.SET_DST_ASSET)}
            goToNext={() => setActiveStep(STEPS.SWAP_CONFIRM)}
          />
        );
      }
      case STEPS.SET_FROM_ASSET:
      default: {
        return (
          <SwapAsset
            selectionType="source"
            hiddenAssets={[transactionData.destinationAsset]}
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            onClickAsset={(canonical: string, isContract: boolean) => {
              dispatch(saveAsset(canonical));
              dispatch(saveIsToken(isContract));
              dispatch(saveAmount("0"));
              dispatch(saveAmountUsd("0.00"));
              // Can't swap a token for itself: if it matches the current
              // destination, reset the destination to "(+) Select".
              if (canonical === transactionData.destinationAsset) {
                dispatch(saveDestinationAsset(""));
                dispatch(saveDestinationTokenDetails(null));
              }
              emitMetric(METRIC_NAMES.swapSourceSelected, {
                tokenCode: getAssetFromCanonical(canonical).code,
                tokenIssuer: getAssetFromCanonical(canonical).issuer,
                source: "balances",
              });
              setActiveStep(STEPS.AMOUNT);
            }}
          />
        );
      }
    }
  };

  return renderStep(activeStep);
};
