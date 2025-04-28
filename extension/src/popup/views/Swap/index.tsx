import React from "react";
import { useNavigate } from "react-router-dom";

import { STEPS } from "popup/constants/swap";
import { ROUTES } from "popup/constants/routes";
import { emitMetric } from "helpers/metrics";
import { VerifiedAccountRoute } from "popup/Router";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { METRIC_NAMES } from "popup/constants/metricsNames";

export const Swap = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = React.useState(STEPS.AMOUNT);

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
          <VerifiedAccountRoute>
            <SendConfirm goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)} />
          </VerifiedAccountRoute>
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
      default:
      case STEPS.AMOUNT: {
        emitMetric(METRIC_NAMES.swapAmount);
        return (
          <VerifiedAccountRoute>
            <SendAmount
              goBack={() => navigate(ROUTES.account)}
              goToNext={() => setActiveStep(STEPS.SWAP_SETTINGS)}
              goToChooseAsset={() => setActiveStep(STEPS.CHOOSE_ASSETS)}
            />
          </VerifiedAccountRoute>
        );
      }
      case STEPS.CHOOSE_ASSETS: {
        return <ChooseAsset goBack={() => setActiveStep(STEPS.AMOUNT)} />;
      }
    }
  };

  return renderStep(activeStep);
};
