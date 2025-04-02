import React from "react";
import { useNavigate } from "react-router-dom";

import { STEPS } from "popup/constants/swap";
import { ROUTES } from "popup/constants/routes";
import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";

export const Swap = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = React.useState(STEPS.AMOUNT);

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.SET_SWAP_TIMEOUT: {
        return (
          <PublicKeyRoute>
            <SendSettingsTxTimeout
              goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SWAP_CONFIRM: {
        return (
          <VerifiedAccountRoute>
            <SendConfirm goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)} />
          </VerifiedAccountRoute>
        );
      }
      case STEPS.SET_SWAP_SLIPPAGE: {
        return (
          <PublicKeyRoute>
            <SendSettingsSlippage
              goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SET_SWAP_FEE: {
        return (
          <PublicKeyRoute>
            <SendSettingsFee
              goBack={() => setActiveStep(STEPS.SWAP_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SWAP_SETTINGS: {
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
        return (
          <PublicKeyRoute>
            <SendAmount
              goBack={() => navigate(ROUTES.account)}
              goToNext={() => setActiveStep(STEPS.SWAP_SETTINGS)}
              // TODO: do this route
              goToChooseAsset={() => setActiveStep(STEPS.SWAP_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
    }
  };

  return renderStep(activeStep);
};
