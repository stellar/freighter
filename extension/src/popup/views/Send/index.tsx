import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/send-payment";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SendTo } from "popup/components/send/SendTo";
import { SendAmount } from "popup/components/send/SendAmount";
import { SendDestinationAsset } from "popup/components/send/SendDestinationAsset";
import { TransactionConfirm } from "popup/components/InternalTransaction/SubmitTransaction";
import {
  isPathPaymentSelector,
  resetSubmission,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import { useSimulateTxData } from "popup/components/send/SendAmount/hooks/useSimulateTxData";
import { useSimulateTxData as useSimulateCollectibleTxData } from "popup/components/sendCollectible/SelectedCollectible/hooks/useSimulateTxData";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { TabsList } from "../Account/contexts/activeTabContext";
import { navigateTo } from "popup/helpers/navigate";
import { RequestState } from "constants/request";
import { View } from "popup/basics/layout/View";

import { useSendQueryParams } from "./hooks/useSendQueryParams";

/* 
  Send handles sending both tokens (classic and Soroban) and collectibles to an external destination (G, M, or C account).
  This flow entails selecting an item, selecting a destination, adjusting fees and memos, reviewing the transaction, and submitting the transaction.
*/
export const Send = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { recommendedFee, networkCongestion } = useNetworkFees();
  const { t } = useTranslation();

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
      isCollectible,
    },
    transactionSimulation,
  } = submission;

  /* Construct simulation parameters for an asset payment */
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

  /* Hook used to simulate a possible token transaction */
  const { state: paymentSimulationState, fetchData: fetchPaymentData } =
    useSimulateTxData({
      publicKey,
      destination,
      networkDetails,
      destAsset: getAssetFromCanonical(destinationAsset || "native"),
      sourceAsset: asset,
      simParams,
      isMainnet: isMainnet(networkDetails),
    });

  /* Hook used to simulate a possible collectible transaction */
  const { state: collectibleSimulationState, fetchData: fetchCollectibleData } =
    useSimulateCollectibleTxData({
      publicKey,
      destination,
      networkDetails,
    });

  const [activeStep, setActiveStep] = React.useState(STEPS.AMOUNT);

  // Handle query params and set defaults on mount
  // This is used to pre-populate the destination, asset and/or collectible data if they are provided in the query params.
  useSendQueryParams();

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.PAYMENT_CONFIRM: {
        emitMetric(METRIC_NAMES.sendPaymentConfirm);
        let xdr = "";

        // based on the type of Send, we need to get the XDR from the appropriate simulation state
        if (isCollectible) {
          if (collectibleSimulationState.state === RequestState.SUCCESS) {
            xdr = collectibleSimulationState.data.transactionXdr;
          }
        } else {
          if (paymentSimulationState.state === RequestState.SUCCESS) {
            xdr = paymentSimulationState.data.transactionXdr;
          }
        }

        if (!xdr) {
          return (
            <View.Content hasNoTopPadding>
              <Notification
                variant="error"
                title={t("Failed to simulate transaction")}
              >
                {t(
                  "An unknown error has occured while simulating this transaction.",
                )}
              </Notification>
            </View.Content>
          );
        }

        return (
          <TransactionConfirm
            xdr={xdr}
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
              if (isCollectible) {
                navigateTo(
                  ROUTES.sendPayment,
                  navigate,
                  `?tab=${TabsList.COLLECTIBLES}`,
                );
              } else {
                navigateTo(ROUTES.account, navigate);
              }
            }}
            goToNext={() => setActiveStep(STEPS.PAYMENT_CONFIRM)}
            goToChooseDest={() => setActiveStep(STEPS.DESTINATION)}
            goToChooseAsset={() => setActiveStep(STEPS.SET_DESTINATION_ASSET)}
            fetchSimulationData={
              isCollectible ? fetchCollectibleData : fetchPaymentData
            }
            simulationState={
              isCollectible
                ? collectibleSimulationState
                : paymentSimulationState
            }
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
