import React from "react";
import { useDispatch } from "react-redux";

import { STEPS } from "popup/constants/swap";
import { emitMetric } from "helpers/metrics";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SwapFrom } from "popup/components/swap/SwapFrom";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { AppDispatch } from "popup/App";
import {
  saveAsset,
  saveDestinationAsset,
  saveIsToken,
} from "popup/ducks/transactionSubmission";

export const Swap = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [activeStep, setActiveStep] = React.useState(STEPS.SET_FROM_ASSET);

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.SET_SWAP_TIMEOUT: {
        emitMetric(METRIC_NAMES.swapSettingsTimeout);
        return (
          <SendSettingsTxTimeout
            goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
          />
        );
      }
      case STEPS.SWAP_CONFIRM: {
        emitMetric(METRIC_NAMES.swapConfirm);
        return (
          <SendConfirm goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)} />
        );
      }
      case STEPS.SET_SWAP_SLIPPAGE: {
        emitMetric(METRIC_NAMES.swapSettingsSlippage);
        return (
          <SendSettingsSlippage
            goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
          />
        );
      }
      case STEPS.SET_SWAP_FEE: {
        emitMetric(METRIC_NAMES.swapSettingsFee);
        return (
          <SendSettingsFee goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)} />
        );
      }
      case STEPS.SWAP_SETTINGS: {
        emitMetric(METRIC_NAMES.swapSettings);
        return (
          <SendSettings
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            goToNext={() => setActiveStep(STEPS.SWAP_CONFIRM)}
            goToFeeSetting={() => setActiveStep(STEPS.SET_SWAP_FEE)}
            goToSlippageSetting={() => setActiveStep(STEPS.SET_SWAP_SLIPPAGE)}
            goToTimeoutSetting={() => setActiveStep(STEPS.SET_SWAP_TIMEOUT)}
          />
        );
      }
      case STEPS.SET_DST_ASSET: {
        emitMetric(METRIC_NAMES.swapTo);
        return (
          <SwapFrom
            title="Swap to"
            onClickAsset={(canonical: string, isContract: boolean) => {
              dispatch(saveDestinationAsset(canonical));
              dispatch(saveIsToken(isContract));
              setActiveStep(STEPS.AMOUNT);
            }}
          />
        );
      }

      case STEPS.SET_FROM_ASSET:
      default: {
        emitMetric(METRIC_NAMES.swapFrom);
        return (
          <SwapFrom
            title="Swap from"
            onClickAsset={(canonical: string, isContract: boolean) => {
              dispatch(saveAsset(canonical));
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
            goBack={() => setActiveStep(STEPS.SET_FROM_ASSET)}
            goToNext={() => setActiveStep(STEPS.SET_DST_ASSET)}
          />
        );
      }
      case STEPS.CHOOSE_ASSETS: {
        return <ChooseAsset goBack={() => setActiveStep(STEPS.AMOUNT)} />;
      }
    }
  };

  return renderStep(activeStep);
};
