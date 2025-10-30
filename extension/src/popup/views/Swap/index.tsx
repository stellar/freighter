import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

import { STEPS } from "popup/constants/swap";
import { emitMetric } from "helpers/metrics";
import { InputType } from "helpers/transaction";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SwapAsset } from "popup/components/swap/SwapAsset";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { AppDispatch } from "popup/App";
import {
  resetSubmission,
  saveAsset,
  saveDestinationAsset,
  saveIsToken,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { resetSimulation } from "popup/ducks/token-payment";

export const Swap = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeStep, setActiveStep] = React.useState(STEPS.AMOUNT);
  const submission = useSelector(transactionSubmissionSelector);
  const { transactionSimulation, transactionData } = submission;

  const [inputType, setInputType] = useState<InputType>("crypto");

  useEffect(() => {
    dispatch(resetSimulation());
    dispatch(resetSubmission());

    // Handle query params and set defaults on mount
    const params = new URLSearchParams(location.search);
    const sourceAssetParam = params.get("source_asset");
    const destinationAssetParam = params.get("destination_asset");

    // Pre-populate source asset if provided, otherwise default to native
    if (sourceAssetParam) {
      dispatch(saveAsset(sourceAssetParam));
    } else {
      // Set default asset to native if not provided
      dispatch(saveAsset("native"));
      dispatch(saveIsToken(false));
    }

    // Pre-populate destination asset if provided
    if (destinationAssetParam) {
      dispatch(saveDestinationAsset(destinationAssetParam));
    }
  }, [dispatch, location.search]);

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.SWAP_CONFIRM: {
        emitMetric(METRIC_NAMES.swapConfirm);
        return (
          <TransactionConfirm
            xdr={transactionSimulation.preparedTransaction!}
            goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
          />
        );
      }
      case STEPS.SET_DST_ASSET: {
        emitMetric(METRIC_NAMES.swapTo);
        return (
          <SwapAsset
            title="Swap to"
            hiddenAssets={[transactionData.asset]}
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            onClickAsset={(canonical: string, isContract: boolean) => {
              dispatch(saveDestinationAsset(canonical));
              dispatch(saveIsToken(isContract));
              setActiveStep(STEPS.AMOUNT);
            }}
          />
        );
      }
      case STEPS.AMOUNT: {
        emitMetric(METRIC_NAMES.swapAmount);
        return (
          <SwapAmount
            inputType={inputType}
            setInputType={setInputType}
            goBack={() => navigateTo(ROUTES.account, navigate)}
            goToEditSrc={() => setActiveStep(STEPS.SET_FROM_ASSET)}
            goToEditDst={() => setActiveStep(STEPS.SET_DST_ASSET)}
            goToNext={() => setActiveStep(STEPS.SWAP_CONFIRM)}
          />
        );
      }
      case STEPS.CONFIRM_AMOUNT: {
        emitMetric(METRIC_NAMES.swapAmount);
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
        emitMetric(METRIC_NAMES.swapFrom);
        return (
          <SwapAsset
            title="Swap from"
            hiddenAssets={[transactionData.destinationAsset]}
            goBack={() => {
              navigateTo(ROUTES.account, navigate);
            }}
            onClickAsset={(canonical: string, isContract: boolean) => {
              dispatch(saveAsset(canonical));
              dispatch(saveIsToken(isContract));
              setActiveStep(STEPS.AMOUNT);
            }}
          />
        );
      }
    }
  };

  return renderStep(activeStep);
};
