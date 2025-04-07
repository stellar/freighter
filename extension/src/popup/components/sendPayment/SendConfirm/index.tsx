import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { TransactionData } from "types/transactions";
import { useSignTx } from "helpers/hooks/useSignTx";
import { useSubmitTx } from "helpers/hooks/useSubmitTx";
import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { MemoRequiredAccount } from "@shared/api/types";
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
  const { state: signedTransaction, signTx } = useSignTx(
    publicKey,
    networkDetails,
  );
  const { state: txResponse, submitTx } = useSubmitTx(networkDetails);

  const render = () => {
    if (isSendComplete) {
      return (
        <TransactionDetails
          shouldScanTx={false}
          transactionData={transactionData}
          signedTransaction={signedTransaction.data?.signedTransaction!}
          transactionSimulation={transactionSimulation}
          signTx={signTx}
          submitTx={submitTx}
          submissionStatus={txResponse.state}
          transactionHash={txResponse.data?.hash!}
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
            signedTransaction={signedTransaction.data?.signedTransaction!}
            transactionSimulation={transactionSimulation}
            signTx={signTx}
            submitTx={submitTx}
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
            signedTransaction={signedTransaction.data?.signedTransaction!}
            transactionSimulation={transactionSimulation}
            signTx={signTx}
            submitTx={submitTx}
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
            signedTransaction={signedTransaction.data?.signedTransaction!}
            transactionSimulation={transactionSimulation}
            signTx={signTx}
            submitTx={submitTx}
            submissionStatus={RequestState.IDLE}
            transactionHash={""}
          />
        );
    }
  };

  return render();
};
