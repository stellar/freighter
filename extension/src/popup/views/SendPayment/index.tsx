import React from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/send-payment";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { VerifiedAccountRoute } from "popup/Router";
import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";

export const SendPayment = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = React.useState(STEPS.DESTINATION);

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.CHOOSE_ASSET: {
        return <ChooseAsset goBack={() => setActiveStep(STEPS.AMOUNT)} />;
      }
      case STEPS.SET_PAYMENT_TIMEOUT: {
        emitMetric(METRIC_NAMES.sendPaymentSettingsTimeout);
        return (
          <SendSettingsTxTimeout
            goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
          />
        );
      }
      case STEPS.PAYMENT_CONFIRM: {
        emitMetric(METRIC_NAMES.sendPaymentConfirm);
        return (
          <VerifiedAccountRoute>
            <SendConfirm goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)} />
          </VerifiedAccountRoute>
        );
      }
      case STEPS.SET_PAYMENT_SLIPPAGE: {
        emitMetric(METRIC_NAMES.sendPaymentSettingsSlippage);
        return (
          <SendSettingsSlippage
            goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
          />
        );
      }
      case STEPS.SET_PAYMENT_FEE: {
        emitMetric(METRIC_NAMES.sendPaymentSettingsFee);
        return (
          <SendSettingsFee
            goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
          />
        );
      }
      case STEPS.PAYMENT_SETTINGS: {
        emitMetric(METRIC_NAMES.sendPaymentSettings);
        return (
          <SendSettings
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            goToNext={() => setActiveStep(STEPS.PAYMENT_CONFIRM)}
            goToFeeSetting={() => setActiveStep(STEPS.SET_PAYMENT_FEE)}
            goToSlippageSetting={() =>
              setActiveStep(STEPS.SET_PAYMENT_SLIPPAGE)
            }
            goToTimeoutSetting={() => setActiveStep(STEPS.SET_PAYMENT_TIMEOUT)}
          />
        );
      }
      case STEPS.PAYMENT_TYPE: {
        emitMetric(METRIC_NAMES.sendPaymentType);
        return <SendType setStep={setActiveStep} />;
      }
      case STEPS.AMOUNT: {
        emitMetric(METRIC_NAMES.sendPaymentAmount);
        return (
          <SendAmount
            goBack={() => setActiveStep(STEPS.DESTINATION)}
            goToNext={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
            goToPaymentType={() => setActiveStep(STEPS.PAYMENT_TYPE)}
            goToChooseAsset={() => setActiveStep(STEPS.CHOOSE_ASSET)}
          />
        );
      }
      default:
      case STEPS.DESTINATION: {
        emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
        return (
          <SendTo
            goBack={() => navigate(ROUTES.account)}
            goToNext={() => setActiveStep(STEPS.AMOUNT)}
          />
        );
      }
    }
  };

  return renderStep(activeStep);
};
