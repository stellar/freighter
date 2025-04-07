import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Asset, Networks } from "stellar-sdk";
import { useSelector } from "react-redux";

import { ROUTES } from "popup/constants/routes";
import { STEPS } from "popup/constants/send-payment";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { SendTo } from "popup/components/sendPayment/SendTo";
import { SendAmount } from "popup/components/sendPayment/SendAmount";
import { SendType } from "popup/components/sendPayment/SendAmount/SendType";
import { SendSettingsFee } from "popup/components/sendPayment/SendSettings/TransactionFee";
import { SendSettingsSlippage } from "popup/components/sendPayment/SendSettings/Slippage";
import { SendConfirm } from "popup/components/sendPayment/SendConfirm";
import { SendSettingsTxTimeout } from "popup/components/sendPayment/SendSettings/TxTimeout";
import { SendSettings } from "popup/components/sendPayment/SendSettings";
import { ChooseAsset } from "popup/components/manageAssets/ChooseAsset";
import { TransactionData } from "types/transactions";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { isContractId } from "popup/helpers/soroban";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { NetworkDetails } from "@shared/constants/stellar";
import { getAssetSacAddress } from "@shared/helpers/soroban/token";

import { useGetSettingsData } from "./hooks/useGetSettingsData";

function getSimulationMode(
  isSoroswap: boolean,
  isToken: boolean,
  isSendSacToContract: boolean,
) {
  if (isSoroswap) {
    return "Soroswap";
  }
  if (isToken || isSendSacToContract) {
    return "TokenPayment";
  }
  return "ClassicPayment";
}

function getAssetAddress(
  asset: string,
  destination: string,
  networkDetails: NetworkDetails,
) {
  if (asset === "native") {
    return asset;
  }
  if (
    isContractId(destination) &&
    !isContractId(getAssetFromCanonical(asset).issuer)
  ) {
    return getAssetSacAddress(
      asset,
      networkDetails.networkPassphrase as Networks,
    );
  }
  const [_, issuer] = asset.split(":");
  return issuer;
}

const baseTxData = {
  amount: "0",
  asset: "native",
  destination: "",
  federationAddress: "",
  transactionFee: "",
  transactionTimeout: 180,
  memo: "",
  destinationAsset: "",
  destinationAmount: "",
  destinationIcon: "",
  path: [],
  allowedSlippage: "1",
  isToken: false,
  isSoroswap: false,
} as TransactionData;

export const SendPayment = () => {
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { recommendedFee } = useNetworkFees();

  const [activeStep, setActiveStep] = React.useState(STEPS.DESTINATION);
  const [transactionData, setTransactionData] = React.useState(baseTxData);

  const {
    asset,
    amount,
    decimals,
    destination,
    destinationAmount,
    destinationDecimals,
    transactionFee,
    memo,
    isToken,
    isSoroswap,
    path,
  } = transactionData;

  const isSendSacToContract =
    isContractId(destination) &&
    !isContractId(getAssetFromCanonical(asset).issuer);
  const simulationMode = getSimulationMode(
    isSoroswap,
    isToken,
    isSendSacToContract,
  );

  const getSacContractAddress = useCallback(() => {
    if (asset === "native") {
      return getNativeContractDetails(networkDetails).contract;
    }

    const assetFromCanonical = new Asset(
      getAssetFromCanonical(asset).code,
      getAssetFromCanonical(asset).issuer,
    );
    const contractAddress = assetFromCanonical.contractId(
      networkDetails.networkPassphrase,
    );

    return contractAddress;
  }, [asset, networkDetails]);

  const assetAddress = getAssetAddress(asset, destination, networkDetails);

  const { state: settingsData, fetchData } = useGetSettingsData(
    publicKey,
    networkDetails,
    simulationMode,
    transactionFee || recommendedFee,
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: false,
      includeIcons: true,
    },
    {
      amountIn: amount,
      amountInDecimals: decimals || 0,
      amountOut: destinationAmount,
      amountOutDecimals: destinationDecimals || 0,
      memo,
      transactionFee,
      path,
    },
    {
      address: assetAddress,
      amount,
      publicKey,
      memo,
      params: {
        asset: isSendSacToContract
          ? getSacContractAddress()
          : asset.split(":")[1],
        publicKey,
        destination,
      },
      networkDetails,
      transactionFee,
    },
  );

  const setTxDataKey = <T,>(keyName: string, keyValue: T) => {
    setTransactionData((txData) => {
      return {
        ...txData,
        [keyName]: keyValue,
      };
    });
  };

  const renderStep = (step: STEPS) => {
    switch (step) {
      case STEPS.CHOOSE_ASSET: {
        return (
          <PublicKeyRoute>
            <ChooseAsset
              isManagingAssets={false}
              isPathPaymentDestAsset={transactionData.destinationAsset !== ""}
              onSelectRow={(asset: string) => {
                setTxDataKey<string>("asset", asset);
                setActiveStep(STEPS.AMOUNT);
              }}
              goBack={() => setActiveStep(STEPS.AMOUNT)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SET_PAYMENT_TIMEOUT: {
        emitMetric(METRIC_NAMES.sendPaymentSettingsTimeout);
        return (
          <PublicKeyRoute>
            <SendSettingsTxTimeout
              transactionTimeout={transactionData.transactionTimeout}
              setTimeout={(transactionTimeout: number) =>
                setTxDataKey<number>("transactionTimeout", transactionTimeout)
              }
              goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.PAYMENT_CONFIRM: {
        emitMetric(METRIC_NAMES.sendPaymentConfirm);
        return (
          <VerifiedAccountRoute>
            <SendConfirm
              goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
              publicKey={publicKey}
              networkDetails={networkDetails}
              transactionData={transactionData}
              transactionSimulation={settingsData.data?.simulationResponse}
            />
          </VerifiedAccountRoute>
        );
      }
      case STEPS.SET_PAYMENT_SLIPPAGE: {
        emitMetric(METRIC_NAMES.sendPaymentSettingsSlippage);
        return (
          <PublicKeyRoute>
            <SendSettingsSlippage
              allowedSlippage={transactionData.allowedSlippage}
              setSlippage={(allowedSlippage: string) =>
                setTxDataKey<string>("allowedSlippage", allowedSlippage)
              }
              goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.SET_PAYMENT_FEE: {
        emitMetric(METRIC_NAMES.sendPaymentSettingsFee);
        return (
          <PublicKeyRoute>
            <SendSettingsFee
              goBack={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
              transactionFee={transactionData.transactionFee}
              setFee={(fee: string) => setTxDataKey<string>("fee", fee)}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.PAYMENT_SETTINGS: {
        emitMetric(METRIC_NAMES.sendPaymentSettings);
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
              setMemo={(memo: string | undefined) =>
                setTxDataKey<string | undefined>("memo", memo)
              }
              transactionData={transactionData}
              isPathPayment={transactionData.destinationAsset !== ""}
              settingsData={settingsData}
              fetchData={fetchData}
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.PAYMENT_TYPE: {
        emitMetric(METRIC_NAMES.sendPaymentType);
        return (
          <PublicKeyRoute>
            <SendType
              setStep={setActiveStep}
              destinationAsset={transactionData.destinationAsset}
              setDestinationAsset={(destinationAsset: string) =>
                setTxDataKey<string>("destinationAsset", destinationAsset)
              }
            />
          </PublicKeyRoute>
        );
      }
      case STEPS.AMOUNT: {
        emitMetric(METRIC_NAMES.sendPaymentAmount);
        return (
          <PublicKeyRoute>
            <SendAmount
              goBack={() => setActiveStep(STEPS.DESTINATION)}
              goToNext={() => setActiveStep(STEPS.PAYMENT_SETTINGS)}
              goToPaymentType={() => setActiveStep(STEPS.PAYMENT_TYPE)}
              goToChooseAsset={() => setActiveStep(STEPS.CHOOSE_ASSET)}
              transactionData={transactionData}
              setDestinationAssetCanonical={(destination: string) =>
                setTxDataKey<string>("destination", destination)
              }
              setSendAmount={(amount: string) =>
                setTxDataKey<string>("amount", amount)
              }
              setSendAssetCanonical={(asset: string) =>
                setTxDataKey<string>("asset", asset)
              }
            />
          </PublicKeyRoute>
        );
      }
      default:
      case STEPS.DESTINATION: {
        emitMetric(METRIC_NAMES.sendPaymentRecentAddress);
        return (
          <PublicKeyRoute>
            <SendTo
              goBack={() => navigate(ROUTES.account)}
              goToNext={() => setActiveStep(STEPS.AMOUNT)}
              setDestinationAddress={(destination: string) =>
                setTxDataKey<string>("destination", destination)
              }
              setFederationAddress={(federationAddress: string) =>
                setTxDataKey<string>("federationAddress", federationAddress)
              }
            />
          </PublicKeyRoute>
        );
      }
    }
  };

  return renderStep(activeStep);
};
