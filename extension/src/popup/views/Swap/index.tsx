import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { ActionStatus } from "@shared/api/types";
import { STEPS } from "popup/constants/swap";
import {
  emitMetric,
  emitScreenViewed,
  ScreenViewedProps,
} from "helpers/metrics";
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
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getAssetFromCanonical } from "helpers/stellar";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import {
  DEFAULT_SWAP_DEST_CANONICAL,
  NETWORKS,
} from "@shared/constants/stellar";

// Each swap sub-step emits the consolidated `screen.viewed` event; the step's
// identity lives in `screen_name`, declared as a literal below.
const SWAP_SCREEN_BY_STEP: Partial<
  Record<STEPS, { screen_name: string } & ScreenViewedProps>
> = {
  // STEPS.SWAP_CONFIRM is deliberately absent. It renders the submitting
  // screen, which the user only reaches after approving, so it is not the
  // `confirm` stage — SwapAmount's review modal is, and it emits
  // `swap_confirm` itself. This screen's own stages are covered by the
  // submitStatus effect below (processing, then success).
  [STEPS.SET_DST_ASSET]: { screen_name: "swap_to_asset", flow: "swap" },
  [STEPS.AMOUNT]: { screen_name: "swap_amount", flow: "swap" },
  [STEPS.CONFIRM_AMOUNT]: { screen_name: "swap_amount_review", flow: "swap" },
  [STEPS.SET_FROM_ASSET]: { screen_name: "swap_from_asset", flow: "swap" },
};

export const Swap = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(STEPS.AMOUNT);
  const lastEmittedStep = useRef<STEPS | null>(null);
  const hasEmittedProcessing = useRef(false);
  const hasEmittedSuccess = useRef(false);

  // Emit a screen-view metric only once per step transition.
  useEffect(() => {
    if (activeStep === lastEmittedStep.current) return;
    lastEmittedStep.current = activeStep;

    const screen = SWAP_SCREEN_BY_STEP[activeStep];
    if (screen) {
      const { screen_name, ...props } = screen;
      emitScreenViewed(screen_name, props);
    }
  }, [activeStep]);

  const submission = useSelector(transactionSubmissionSelector);

  // The in-flight submission and its terminal success are internal states of
  // the submitting screen rather than distinct steps/routes, so emit their
  // `screen.viewed` here as the submission status advances. Mirrors the send
  // flow's effect so both internal flows report the same stages. Each emits
  // once per submission; the guards reset on IDLE and on ERROR, so a retry
  // after a failure re-emits.
  useEffect(() => {
    if (submission.submitStatus === ActionStatus.PENDING) {
      if (!hasEmittedProcessing.current) {
        hasEmittedProcessing.current = true;
        emitScreenViewed("swap_processing", {
          flow: "swap",
          step: "processing",
        });
      }
    } else if (submission.submitStatus === ActionStatus.SUCCESS) {
      if (!hasEmittedSuccess.current) {
        hasEmittedSuccess.current = true;
        emitScreenViewed("swap_success", { flow: "swap", step: "success" });
      }
    } else if (
      submission.submitStatus === ActionStatus.IDLE ||
      submission.submitStatus === ActionStatus.ERROR
    ) {
      hasEmittedProcessing.current = false;
      hasEmittedSuccess.current = false;
    }
  }, [submission.submitStatus]);

  const { transactionSimulation, transactionData } = submission;
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  // Quote expired at submit (op_under_dest_min / op_too_few_offers): recover to
  // the review screen with a fresh quote instead of dead-ending in SubmitFail.
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
    setActiveStep(STEPS.AMOUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuoteExpiredAtSubmit]);

  const [inputType, setInputType] = useState<InputType>("crypto");
  // Children fetch in their own mount effects, and React runs child effects
  // before this parent effect — so hold rendering until the reset + defaults
  // below have landed in Redux, or the first fetch reads the pre-reset state
  // (e.g. no destination default → no destination price/icon on first load).
  const [areDefaultsApplied, setAreDefaultsApplied] = useState(false);

  useEffect(() => {
    dispatch(resetSimulation());
    dispatch(resetSubmission());

    // Handle query params and set defaults on mount
    const params = new URLSearchParams(location.search);
    const sourceAssetParam = params.get("source_asset");
    const destinationAssetParam = params.get("destination_asset");

    // Pre-populate source asset if provided and valid, otherwise default to native
    let sourceAsset = "native";
    if (sourceAssetParam) {
      try {
        getAssetFromCanonical(sourceAssetParam);
        sourceAsset = sourceAssetParam;
      } catch {
        // Invalid source asset param, use default
      }
    }
    dispatch(saveAsset(sourceAsset));
    if (isNativeAssetId(sourceAsset)) {
      dispatch(saveIsToken(false));
    }

    // Pre-populate destination asset if provided and valid; otherwise default
    // to the network's USDC — or to native when the flow starts from USDC
    // itself (e.g. the USDC asset-details screen), so the sides never collide.
    let destinationAsset = "";
    if (destinationAssetParam) {
      try {
        getAssetFromCanonical(destinationAssetParam);
        destinationAsset = destinationAssetParam;
      } catch {
        // Invalid destination asset param, ignore
      }
    }
    if (!destinationAsset) {
      const defaultDest =
        DEFAULT_SWAP_DEST_CANONICAL[networkDetails.network as NETWORKS];
      if (defaultDest) {
        destinationAsset = defaultDest === sourceAsset ? "native" : defaultDest;
      }
    }
    if (destinationAsset) {
      dispatch(saveDestinationAsset(destinationAsset));
    }
    setAreDefaultsApplied(true);
  }, [dispatch, location.search, networkDetails.network]);

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
                asset_code: details?.tokenCode,
                asset_issuer: details?.issuer,
                requires_trustline: details?.requiresTrustline,
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
                asset_code: getAssetFromCanonical(canonical).code,
                asset_issuer: getAssetFromCanonical(canonical).issuer,
                source: "balances",
              });
              setActiveStep(STEPS.AMOUNT);
            }}
          />
        );
      }
    }
  };

  if (!areDefaultsApplied) {
    return null;
  }

  return renderStep(activeStep);
};
