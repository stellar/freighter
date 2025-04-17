import React from "react";
import { useNavigate } from "react-router-dom";

import { STEPS } from "popup/constants/swap";
import { ROUTES } from "popup/constants/routes";
import { emitMetric } from "helpers/metrics";
import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
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
          <PublicKeyRoute>
            <SendSettingsTxTimeout
              goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
            />
          </PublicKeyRoute>
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
          <PublicKeyRoute>
            <SendSettingsSlippage
              goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SET_SWAP_FEE: {
        emitMetric(METRIC_NAMES.swapSettingsFee);
        return (
          <PublicKeyRoute>
            <SendSettingsFee
              goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SWAP_SETTINGS: {
        emitMetric(METRIC_NAMES.swapSettings);
        return (
          <PublicKeyRoute>
            <SendSettings
              goBack={() => setActiveStep(STEPS.AMOUNT)}
              goToNext={() => setActiveStep(STEPS.SWAP_CONFIRM)}
              goToFeeSetting={() => setActiveStep(STEPS.SET_SWAP_FEE)}
              goToSlippageSetting={() => setActiveStep(STEPS.SET_SWAP_SLIPPAGE)}
              goToTimeoutSetting={() => setActiveStep(STEPS.SET_SWAP_TIMEOUT)}
            />
          </PublicKeyRoute>
        );
      }
      default:
      case STEPS.AMOUNT: {
        emitMetric(METRIC_NAMES.swapAmount);
        return (
          <PublicKeyRoute>
            <SendAmount
              goBack={() => navigate(ROUTES.account)}
              goToNext={() => setActiveStep(STEPS.SWAP_SETTINGS)}
              goToChooseAsset={() => setActiveStep(STEPS.CHOOSE_ASSETS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.CHOOSE_ASSETS: {
        return (
          <PublicKeyRoute>
            <ChooseAsset goBack={() => setActiveStep(STEPS.AMOUNT)} />
          </PublicKeyRoute>
        );
      }
    }
  };

  return renderStep(activeStep);
};
