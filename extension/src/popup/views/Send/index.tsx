import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { InputWidthProvider } from "./contexts/inputWidthContext";

import "./styles.scss";

const SEND_METRIC_BY_STEP: Partial<Record<STEPS, string>> = {
  [STEPS.SELECT_SOURCE_ASSET]: METRIC_NAMES.sendPaymentSelectAsset,
  [STEPS.AMOUNT]: METRIC_NAMES.sendPaymentAmount,
  [STEPS.PAYMENT_CONFIRM]: METRIC_NAMES.sendPaymentConfirm,
  [STEPS.DESTINATION]: METRIC_NAMES.sendPaymentRecentAddress,
};

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

  const location = useLocation();
  const sendParams = new URLSearchParams(location.search);
  const returnTo = sendParams.get("return_to");
  const returnAsset = sendParams.get("return_asset");
  const returnCollectionAddress = sendParams.get("return_collection_address");
  const returnCollectibleTokenId = sendParams.get(
    "return_collectible_token_id",
  );

  const closeSendFlow = () => {
    dispatch(resetSubmission());

    if (returnTo === "asset_detail" && returnAsset) {
      navigateTo(
        ROUTES.account,
        navigate,
        `?tab=${TabsList.TOKENS}&asset_detail=${encodeURIComponent(returnAsset)}`,
      );
      return;
    }

    if (
      returnTo === "collectible_detail" &&
      returnCollectionAddress &&
      returnCollectibleTokenId
    ) {
      navigateTo(
        ROUTES.account,
        navigate,
        `?tab=${TabsList.COLLECTIBLES}&collection_detail=${encodeURIComponent(
          returnCollectionAddress,
        )}&collectible_token_id=${encodeURIComponent(returnCollectibleTokenId)}`,
      );
      return;
    }

    navigateTo(ROUTES.account, navigate);
  };

  const initialStepRef = useRef<STEPS>(
    (() => {
      const params = new URLSearchParams(location.search);
      return params.has("asset") || params.has("collection_address")
        ? STEPS.DESTINATION
        : STEPS.SELECT_SOURCE_ASSET;
    })(),
  );

  const [activeStep, setActiveStep] = useState(initialStepRef.current);
  const [prevStep, setPrevStep] = useState(initialStepRef.current);
  const [visitedSteps, setVisitedSteps] = useState<Record<STEPS, boolean>>({
    [initialStepRef.current]: true,
  } as Record<STEPS, boolean>);

  const initialAnim =
    initialStepRef.current === STEPS.SELECT_SOURCE_ASSET
      ? "from-bottom"
      : "from-right";
  const [enterAnim, setEnterAnim] = useState<
    "from-bottom" | "from-right" | "from-left" | "static"
  >(initialAnim);

  const lastEmittedStep = useRef<STEPS | null>(null);

  const goToStep = (
    next: STEPS,
    anim: "from-bottom" | "from-right" | "from-left" | "dismiss",
  ) => {
    setPrevStep(activeStep);
    setEnterAnim(anim === "dismiss" ? "from-bottom" : anim);
    setVisitedSteps((currentSteps) => ({
      ...currentSteps,
      [next]: true,
    }));
    setActiveStep(next);
  };

  useEffect(() => {
    dispatch(resetSubmission());
  }, [dispatch]);

  // Emit a screen-view metric only once per step transition.
  useEffect(() => {
    if (activeStep === lastEmittedStep.current) return;
    lastEmittedStep.current = activeStep;

    const metric = SEND_METRIC_BY_STEP[activeStep];
    if (metric) {
      emitMetric(metric);
    }
  }, [activeStep]);

  // Handle query params and set defaults on mount
  // This is used to pre-populate the destination, asset and/or collectible data if they are provided in the query params.
  useSendQueryParams();

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.PAYMENT_CONFIRM: {
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
                  "An unknown error has occurred while simulating this transaction.",
                )}
              </Notification>
            </View.Content>
          );
        }

        return (
          <TransactionConfirm
            xdr={xdr}
            goBack={() => goToStep(STEPS.AMOUNT, "dismiss")}
          />
        );
      }
      case STEPS.AMOUNT: {
        return (
          <SendAmount
            goBack={() => {
              closeSendFlow();
            }}
            goToNext={() => goToStep(STEPS.PAYMENT_CONFIRM, "from-bottom")}
            goToChooseDest={() => goToStep(STEPS.DESTINATION, "from-bottom")}
            goToChooseAsset={() =>
              goToStep(STEPS.SET_DESTINATION_ASSET, "from-bottom")
            }
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
      case STEPS.SELECT_SOURCE_ASSET: {
        return (
          <SendDestinationAsset
            goBack={() => {
              dispatch(resetSubmission());
              navigateTo(ROUTES.account, navigate);
            }}
            goToNext={() => goToStep(STEPS.DESTINATION, "from-right")}
            showCloseIcon
          />
        );
      }
      case STEPS.SET_DESTINATION_ASSET: {
        return (
          <SendDestinationAsset
            goBack={() => goToStep(STEPS.AMOUNT, "dismiss")}
            goToNext={() => goToStep(STEPS.AMOUNT, "dismiss")}
          />
        );
      }
      default:
      case STEPS.DESTINATION: {
        const fromAmount = prevStep === STEPS.AMOUNT;
        return (
          <SendTo
            goBack={() => {
              if (fromAmount) {
                goToStep(STEPS.AMOUNT, "dismiss");
              } else if (prevStep === STEPS.SELECT_SOURCE_ASSET) {
                goToStep(STEPS.SELECT_SOURCE_ASSET, "from-left");
              } else {
                closeSendFlow();
              }
            }}
            goToNext={() =>
              goToStep(STEPS.AMOUNT, fromAmount ? "dismiss" : "from-bottom")
            }
          />
        );
      }
    }
  };

  return (
    <div className="Send">
      {(Object.values(STEPS) as STEPS[]).map((step) => {
        if (!visitedSteps[step]) {
          return null;
        }

        const isActive = activeStep === step;

        return (
          <div
            key={step}
            className={`Send__step ${
              isActive ? `Send__step--${enterAnim}` : "Send__step--hidden"
            }`}
            aria-hidden={!isActive}
          >
            <InputWidthProvider>{renderStep(step)}</InputWidthProvider>
          </div>
        );
      })}
    </div>
  );
};
