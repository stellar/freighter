import React from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/send-payment";
import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";
import { ChooseAsset } from "popup/components/sendPayment/ChooseAsset";

export const SendPayment = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = React.useState(STEPS.DESTINATION);

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.CHOOSE_ASSET: {
        return (
          <PublicKeyRoute>
            <ChooseAsset goBack={() => setActiveStep(STEPS.AMOUNT)} />
          </PublicKeyRoute>
        );
      }
      case STEPS.SET_PAYMENT_TIMEOUT: {
        return (
          <PublicKeyRoute>
            <SendSettingsTxTimeout
              goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.PAYMENT_CONFIRM: {
        return (
          <VerifiedAccountRoute>
            <SendConfirm goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)} />
          </VerifiedAccountRoute>
        );
      }
      case STEPS.SET_PAYMENT_SLIPPAGE: {
        return (
          <PublicKeyRoute>
            <SendSettingsSlippage
              goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SET_PAYMENT_FEE: {
        return (
          <PublicKeyRoute>
            <SendSettingsFee
              goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.PAYMENT_SETTINGS: {
        return (
          <PublicKeyRoute>
            <SendSettings
              goBack={() => setActiveStep(STEPS.AMOUNT)}
              goToNext={() => setActiveStep(STEPS.PAYMENT_CONFIRM)}
              goToFeeSetting={() => setActiveStep(STEPS.SET_PAYMENT_FEE)}
              goToSlippageSetting={() =>
                setActiveStep(STEPS.SET_PAYMENT_SLIPPAGE)
              }
              goToTimeoutSetting={() =>
                setActiveStep(STEPS.SET_PAYMENT_TIMEOUT)
              }
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.PAYMENT_TYPE: {
        return (
          <PublicKeyRoute>
            <SendType setStep={setActiveStep} />
          </PublicKeyRoute>
        );
      }
      case STEPS.AMOUNT: {
        return (
          <PublicKeyRoute>
            <SendAmount
              goBack={() => setActiveStep(STEPS.DESTINATION)}
              goToNext={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
              goToPaymentType={() => setActiveStep(STEPS.PAYMENT_TYPE)}
              goToChooseAsset={() => setActiveStep(STEPS.CHOOSE_ASSET)}
            />
          </PublicKeyRoute>
        );
      }
      default:
      case STEPS.DESTINATION: {
        return (
          <PublicKeyRoute>
            <SendTo
              goBack={() => navigate(ROUTES.account)}
              goToNext={() => setActiveStep(STEPS.AMOUNT)}
            />
          </PublicKeyRoute>
        );
      }
    }
  };

  return renderStep(activeStep);
};
