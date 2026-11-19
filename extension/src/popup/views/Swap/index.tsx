import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { STEPS, SwapSource, isSwapSource } from "popup/constants/swap";
import { emitMetric, emitScreenViewed } from "helpers/metrics";
import { InputType } from "helpers/transaction";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SwapAsset } from "popup/components/swap/SwapAsset";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { useSwapSubmitScreenViews } from "popup/components/swap/hooks/useSwapSubmitScreenViews";
import { SWAP_SCREEN_BY_STEP, swapSourceProps } from "popup/metrics/swap";
import { useSwapSubmitQuoteExpiry } from "popup/components/swap/hooks/useSwapSubmitQuoteExpiry";
import { AppDispatch, AppState } from "popup/App";
import {
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
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { resetSimulation } from "popup/ducks/token-payment";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { isAssetVisible } from "popup/helpers/settings";
import { readHiddenAssets } from "popup/helpers/useHiddenAssets";
import { getAssetFromCanonical } from "helpers/stellar";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import {
  DEFAULT_SWAP_DEST_CANONICAL,
  NETWORKS,
} from "@shared/constants/stellar";

export const Swap = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = useState(STEPS.AMOUNT);
  const lastEmittedStep = useRef<STEPS | null>(null);
  // Where the swap was opened from, read off the URL rather than the store:
  // the first screen view fires before the mount effect saves it there.
  // Whitelisted so arbitrary query values never reach analytics; anything
  // else, or no param at all, is Home's Swap tile.
  const swapSource = useMemo(() => {
    const sourceParam = new URLSearchParams(location.search).get("source");
    return isSwapSource(sourceParam) ? sourceParam : SwapSource.Home;
  }, [location.search]);

  // Emit a screen-view metric only once per step transition.
  useEffect(() => {
    if (activeStep === lastEmittedStep.current) return;
    lastEmittedStep.current = activeStep;

    const screen = SWAP_SCREEN_BY_STEP[activeStep];
    if (screen) {
      const { screen_name, ...props } = screen;
      emitScreenViewed(screen_name, {
        ...props,
        ...swapSourceProps(swapSource),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  const submission = useSelector(transactionSubmissionSelector);

  const { transactionSimulation, transactionData } = submission;
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const store = useStore<AppState>();

  const { isQuoteExpiredAtSubmit } = useSwapSubmitQuoteExpiry({
    onRecover: () => setActiveStep(STEPS.AMOUNT),
  });

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

    dispatch(saveSwapSource(swapSource));

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
    let isCancelled = false;

    const applyDestination = async () => {
      if (!destinationAsset) {
        const defaultDest =
          DEFAULT_SWAP_DEST_CANONICAL[networkDetails.network as NETWORKS];
        if (defaultDest === sourceAsset) {
          destinationAsset = "native";
        } else if (defaultDest) {
          // A hidden default stays unselected: the pickers leave hidden
          // tokens out, so preselecting one would be the only place it
          // still shows up. The account is read from the store at call
          // time so this mount-only effect never re-runs (and resets) for it.
          const hiddenAssets = await readHiddenAssets(
            publicKeySelector(store.getState()),
            networkDetails.network,
          );
          if (isAssetVisible(hiddenAssets, defaultDest)) {
            destinationAsset = defaultDest;
          }
        }
      }
      if (isCancelled) {
        return;
      }
      if (destinationAsset) {
        dispatch(saveDestinationAsset(destinationAsset));
      }
      setAreDefaultsApplied(true);
    };

    applyDestination();

    return () => {
      isCancelled = true;
    };
  }, [dispatch, location.search, networkDetails.network, store, swapSource]);

  // The submission's processing and success screen views.
  useSwapSubmitScreenViews(swapSource);

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
                list: details?.source,
                ...swapSourceProps(swapSource),
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
                list: "balances",
                ...swapSourceProps(swapSource),
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
