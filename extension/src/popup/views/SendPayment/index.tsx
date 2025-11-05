import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { StrKey } from "stellar-sdk";

import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/send-payment";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendDestinationAsset } from "popup/components/sendPayment/SendDestinationAsset";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import {
  isPathPaymentSelector,
  resetSubmission,
  saveAsset,
  saveDestination,
  saveFederationAddress,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import { useSimulateTxData } from "popup/components/sendPayment/SendAmount/hooks/useSimulateTxData";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { useNetworkFees } from "popup/helpers/useNetworkFees";

export const SendPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { recommendedFee, networkCongestion } = useNetworkFees();

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
          transactionFee: transactionFee || recommendedFee,
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

  const [activeStep, setActiveStep] = React.useState(STEPS.AMOUNT);

  // Handle query params and set defaults on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const destinationParam = params.get("destination");
    const assetParam = params.get("asset");

    // Pre-populate destination if provided and valid
    if (destinationParam) {
      const isValidDestination =
        StrKey.isValidEd25519PublicKey(destinationParam) ||
        isContractId(destinationParam);

      if (isValidDestination) {
        dispatch(saveDestination(destinationParam));
        dispatch(saveFederationAddress("")); // Reset federation address
      }
    }

    // Pre-populate asset if provided and valid, otherwise default to native
    if (assetParam) {
      try {
        getAssetFromCanonical(assetParam);
        dispatch(saveAsset(assetParam));
      } catch {
        // Invalid asset param, ignore and use default
        if (!srcAsset) {
          dispatch(saveAsset("native"));
        }
      }
    } else if (!srcAsset) {
      // Set default asset to native if not already set
      dispatch(saveAsset("native"));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.PAYMENT_CONFIRM: {
        emitMetric(METRIC_NAMES.sendPaymentConfirm);
        return (
          <TransactionConfirm
            xdr={simulationState.data?.transactionXdr!}
            goBack={() => setActiveStep(STEPS.AMOUNT)}
          />
        );
      }
      case STEPS.AMOUNT: {
        emitMetric(METRIC_NAMES.sendPaymentAmount);
        return (
          <SendAmount
            goBack={() => {
              dispatch(resetSubmission());
              navigate(ROUTES.account);
            }}
            goToNext={() => setActiveStep(STEPS.PAYMENT_CONFIRM)}
            goToChooseDest={() => setActiveStep(STEPS.DESTINATION)}
            goToChooseAsset={() => setActiveStep(STEPS.SET_DESTINATION_ASSET)}
            fetchSimulationData={fetchData}
            simulationState={simulationState}
            recommendedFee={recommendedFee}
            networkCongestion={networkCongestion}
          />
        );
      }
      case STEPS.SET_DESTINATION_ASSET: {
        return (
          <SendDestinationAsset
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            goToNext={() => setActiveStep(STEPS.AMOUNT)}
            goToDestination={() => setActiveStep(STEPS.DESTINATION)}
          />
        );
      }
      default:
      case STEPS.DESTINATION: {
        emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
        return (
          <SendTo
            goBack={() => setActiveStep(STEPS.AMOUNT)}
            goToNext={() => setActiveStep(STEPS.AMOUNT)}
          />
        );
      }
    }
  };

  return renderStep(activeStep);
};
