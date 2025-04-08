import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HorizonApi } from "stellar-sdk/lib/horizon";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { TransactionData } from "types/transactions";
import { useSignAndSubmit } from "./TransactionDetails/hooks/useSignAndSubmitTx";
import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { GetSettingsData } from "popup/views/SendPayment/hooks/useGetSettingsData";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAssetFromCanonical } from "helpers/stellar";

import { SubmitFail, SubmitSuccess } from "./SubmitResult";
import { TransactionDetails } from "./TransactionDetails";

import "../styles.scss";

interface SendConfirm {
  publicKey: string;
  networkDetails: NetworkDetails;
  goBack: () => void;
  transactionData: TransactionData;
  transactionSimulation: GetSettingsData["simulationResponse"];
}

export const SendConfirm = ({
  goBack,
  publicKey,
  networkDetails,
  transactionData,
  transactionSimulation,
}: SendConfirm) => {
  const navigate = useNavigate();
  const { asset, destinationAsset, allowedSlippage } = transactionData;
  const sourceAsset = getAssetFromCanonical(asset);
  const destAsset = getAssetFromCanonical(destinationAsset || "native");
  const isPathPayment = destinationAsset !== "";

  const [isSendComplete, setIsSendComplete] = useState(false);
  const {
    state: txResponse,
    signAndSubmit,
    signAndSubmitHardware,
  } = useSignAndSubmit(publicKey, networkDetails);

  const render = () => {
    if (isSendComplete) {
      return (
        <TransactionDetails
          shouldScanTx={false}
          transactionData={transactionData}
          transactionSimulation={transactionSimulation}
          signAndSubmit={signAndSubmit}
          signAndSubmitHardware={signAndSubmitHardware}
          submissionStatus={txResponse.state}
          transactionHash={
            (txResponse.data! as HorizonApi.SubmitTransactionResponse).hash
          }
          goBack={() => {
            navigateTo(ROUTES.accountHistory, navigate);
          }}
        />
      );
    }

    switch (txResponse.state) {
      case RequestState.ERROR:
        return <SubmitFail />;
      case RequestState.IDLE:
        return (
          <TransactionDetails
            shouldScanTx={true}
            goBack={goBack}
            transactionData={transactionData}
            transactionSimulation={transactionSimulation}
            signAndSubmit={signAndSubmit}
            signAndSubmitHardware={signAndSubmitHardware}
            submissionStatus={txResponse.state}
            transactionHash={""}
          />
        );
      case RequestState.LOADING:
        return (
          <TransactionDetails
            shouldScanTx={false}
            goBack={goBack}
            transactionData={transactionData}
            transactionSimulation={transactionSimulation}
            signAndSubmit={signAndSubmit}
            signAndSubmitHardware={signAndSubmitHardware}
            submissionStatus={txResponse.state}
            transactionHash={""}
          />
        );
      case RequestState.SUCCESS:
        if (isPathPayment) {
          emitMetric(METRIC_NAMES.sendPaymentPathPaymentSuccess, {
            sourceAsset,
            destAsset,
            allowedSlippage,
          });
        } else {
          emitMetric(METRIC_NAMES.sendPaymentSuccess, {
            sourceAsset: sourceAsset.code,
          });
        }
        return <SubmitSuccess viewDetails={() => setIsSendComplete(true)} />;
      default:
        return (
          <TransactionDetails
            shouldScanTx={false}
            goBack={goBack}
            transactionData={transactionData}
            transactionSimulation={transactionSimulation}
            signAndSubmit={signAndSubmit}
            signAndSubmitHardware={signAndSubmitHardware}
            submissionStatus={RequestState.IDLE}
            transactionHash={""}
          />
        );
    }
  };

  return render();
};
