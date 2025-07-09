import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/send-payment";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount2 } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm2 } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { SendDestinationAsset } from "popup/components/sendPayment/SendDestinationAsset";
import {
  isPathPaymentSelector,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import { useSimulateTxData } from "popup/components/sendPayment/SendAmount/hooks/useSimulateTxData";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";

export const SendPayment = () => {
  const navigate = useNavigate();
  const submission = useSelector(transactionSubmissionSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);

  const {
    transactionData: {
      destination,
      amount,
      asset: srcAsset,
      memo,
      transactionFee,
      transactionTimeout,
      allowedSlippage,
      destinationAsset,
      destinationAmount,
      path,
      isToken,
      isSoroswap,
    },
    transactionSimulation,
  } = submission;

  const asset = getAssetFromCanonical(srcAsset);

  const simParams =
    isToken || isSoroswap || isContractId(destination)
      ? {
          type: "soroban" as const,
          xdr: transactionSimulation.preparedTransaction!,
        }
      : {
          type: "classic" as const,
          sourceAsset: asset,
          destAsset: getAssetFromCanonical(destinationAsset || "native"),
          amount,
          destinationAmount,
          allowedSlippage,
          path,
          isPathPayment,
          isSwap: false,
          memo,
          transactionFee,
          transactionTimeout,
        };
  const { state: simulationState, fetchData } = useSimulateTxData({
    publicKey,
    destination,
    networkDetails,
    destAsset: getAssetFromCanonical(destinationAsset || "native"),
    sourceAsset: asset,
    simParams,
    isMainnet: isMainnet(networkDetails),
  });

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
          <SendConfirm2
            xdr={simulationState.data?.transactionXdr!}
            goBack={() => setActiveStep(STEPS.AMOUNT)}
          />
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
          <SendAmount2
            goBack={() => setActiveStep(STEPS.SET_DESTINATION_ASSET)}
            goToNext={() => setActiveStep(STEPS.PAYMENT_CONFIRM)}
            goToChooseDest={() => setActiveStep(STEPS.DESTINATION)}
            fetchSimulationData={fetchData}
            simulationState={simulationState}
          />
        );
      }
      case STEPS.SET_DESTINATION_ASSET: {
        return (
          <SendDestinationAsset
            goBack={() => setActiveStep(STEPS.DESTINATION)}
            goToNext={() => setActiveStep(STEPS.AMOUNT)}
          />
        );
      }
      default:
      case STEPS.DESTINATION: {
        emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
        return (
          <SendTo
            goBack={() => navigate(ROUTES.account)}
            goToNext={() => setActiveStep(STEPS.SET_DESTINATION_ASSET)}
          />
        );
      }
    }
  };

  return renderStep(activeStep);
};
