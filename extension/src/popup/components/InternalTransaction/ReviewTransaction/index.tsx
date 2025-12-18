import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon, Notification } from "@stellar/design-system";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState, State } from "constants/request";
import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  getAssetFromCanonical,
  isMainnet,
  truncatedFedAddress,
  truncatedPublicKey,
} from "helpers/stellar";

import { SimulateTxData } from "popup/components/sendPayment/SendAmount/hooks/useSimulateTxData";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  BlockaidTxScanLabel,
  BlockAidTxScanExpanded,
  MemoRequiredLabel,
} from "popup/components/WarningMessages";
import {
  useShouldTreatTxAsUnableToScan,
  useScanAsset,
} from "popup/helpers/blockaid";
import { BlockAidScanTxResult } from "@shared/api/types";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { CopyValue } from "popup/components/CopyValue";
import { useValidateTransactionMemo } from "popup/helpers/useValidateTransactionMemo";

import "./styles.scss";

type WarningType =
  | "unable-to-scan"
  | "malicious"
  | "suspicious"
  | "error"
  | null;

/**
 * Determines warning type from transaction scan result
 */
const getTransactionWarningType = (
  txScanResult: BlockAidScanTxResult | null | undefined,
  isUnableToScan: boolean,
): WarningType => {
  if (!txScanResult) {
    return isUnableToScan ? "unable-to-scan" : null;
  }

  const { simulation, validation } = txScanResult;

  // Handle simulation error
  if (simulation && "error" in simulation) {
    return "error";
  }

  // Handle validation result
  if (validation && "result_type" in validation) {
    const resultType = validation.result_type;
    if (resultType === "Malicious") {
      return "malicious";
    }
    if (resultType === "Warning") {
      return "suspicious";
    }
  }

  // Handle unable to scan
  if (isUnableToScan) {
    return "unable-to-scan";
  }

  return null;
};

interface ReviewTxProps {
  assetIcon: string | null;
  dstAsset?: {
    icon: string | null;
    canonical: string;
    priceUsd: string | null;
    amount: string;
  };
  fee: string;
  sendAmount: string;
  sendPriceUsd: string | null;
  srcAsset: string;
  simulationState: State<SimulateTxData, string>;
  networkDetails: NetworkDetails;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  onAddMemo?: () => void;
}

export const ReviewTx = ({
  assetIcon,
  dstAsset,
  fee,
  srcAsset,
  sendAmount,
  sendPriceUsd,
  simulationState,
  networkDetails,
  title,
  onConfirm,
  onCancel,
  onAddMemo,
}: ReviewTxProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;

  const [activePaneIndex, setActivePaneIndex] = useState(0);

  const {
    hardwareWalletData: { status: hwStatus },
    transactionData: { destination, memo, federationAddress },
  } = submission;

  // Validate memo requirements using the transaction XDR
  const transactionXdr = simulationState.data?.transactionXdr;
  const { isMemoMissing: isRequiredMemoMissing, isValidatingMemo } =
    useValidateTransactionMemo(transactionXdr);

  // Disable button while validating or if memo is missing
  const isSubmitDisabled = isRequiredMemoMissing || isValidatingMemo;

  const asset = getAssetFromCanonical(srcAsset);
  const dest = dstAsset ? getAssetFromCanonical(dstAsset.canonical) : null;
  const assetIcons = srcAsset !== "native" ? { [srcAsset]: assetIcon } : {};
  const truncatedDest = federationAddress
    ? truncatedFedAddress(federationAddress)
    : truncatedPublicKey(destination);

  // Scan transaction
  const txScanResult = simulationState.data?.scanResult;
  const shouldTreatTxAsUnableToScan = useShouldTreatTxAsUnableToScan();

  // Scan source and destination tokens separately (for swaps)
  const srcAssetAddress =
    srcAsset !== "native" && asset.issuer ? asset.issuer : null;
  const dstAssetAddress =
    dstAsset && dstAsset.canonical !== "native" && dest?.issuer
      ? dest.issuer
      : null;
  const { scannedAsset: srcAssetScanResult } = useScanAsset(
    srcAssetAddress || "",
  );
  const { scannedAsset: dstAssetScanResult } = useScanAsset(
    dstAssetAddress || "",
  );

  // Compute warning state once - used by both label and expanded components
  const isUnableToScan = shouldTreatTxAsUnableToScan(txScanResult);
  const hasScanResult = !!txScanResult;

  // Determine malicious/suspicious from scan result (not dev-only)
  const isMalicious =
    txScanResult?.validation &&
    "result_type" in txScanResult.validation &&
    txScanResult.validation.result_type === "Malicious";
  const isSuspicious =
    txScanResult?.validation &&
    "result_type" in txScanResult.validation &&
    txScanResult.validation.result_type === "Warning";

  // Determine warning type
  const warningType = getTransactionWarningType(txScanResult, isUnableToScan);

  // Determine if transaction warning should be shown
  const hasSimulationData = !!simulationState.data;
  const shouldShowTxWarning =
    hasSimulationData &&
    (hasScanResult ||
      isUnableToScan ||
      isMalicious ||
      isSuspicious ||
      warningType !== null);

  if (simulationState.state === RequestState.ERROR) {
    return (
      <View.Content hasNoTopPadding>
        <div className="ReviewTx">
          <Notification
            variant="error"
            title={t("Failed to fetch your transaction details")}
          >
            {simulationState.error}
          </Notification>
        </div>
      </View.Content>
    );
  }

  const onConfirmTx = () => {
    if (isHardwareWallet) {
      dispatch(
        startHwSign({
          transactionXDR: simulationState.data!.transactionXdr,
          shouldSubmit: true,
        }),
      );
      return;
    }
    onConfirm();
  };

  return (
    <View.Content hasNoTopPadding>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType ? (
        <HardwareSign
          isInternal
          walletType={hardwareWalletType}
          onSubmit={onConfirm}
        />
      ) : (
        <div className="ReviewTx">
          <MultiPaneSlider
            activeIndex={activePaneIndex}
            panes={[
              <>
                <div className="ReviewTx__Summary">
                  <p>{title}</p>
                  <div className="ReviewTx__SendSummary">
                    <div className="ReviewTx__SendAsset">
                      <AssetIcon
                        assetIcons={assetIcons}
                        code={asset.code}
                        issuerKey={asset.issuer}
                        icon={assetIcon}
                        isSuspicious={false}
                      />
                      <div
                        className="ReviewTx__SendAssetDetails"
                        data-testid="review-tx-send-amount"
                      >
                        <span>
                          {sendAmount} {asset.code}
                        </span>
                        {isMainnet(networkDetails) && sendPriceUsd && (
                          <span className="ReviewTx__SendAssetDetails__price">
                            {`$${sendPriceUsd}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ReviewTx__Divider">
                      <Icon.ChevronDownDouble />
                    </div>
                    <div
                      className="ReviewTx__SendDestination"
                      data-testid="review-tx-send-destination"
                    >
                      {dstAsset && dest ? (
                        <>
                          <AssetIcon
                            assetIcons={
                              dstAsset.canonical !== "native"
                                ? { [dstAsset.canonical]: dstAsset.icon }
                                : {}
                            }
                            code={dest.code}
                            issuerKey={dest.issuer}
                            icon={dstAsset.icon}
                            isSuspicious={false}
                          />
                          <div className="ReviewTx__SendAssetDetails">
                            <span>
                              {dstAsset.amount} {dest.code}
                            </span>
                            {isMainnet(networkDetails) && dstAsset.priceUsd && (
                              <span className="ReviewTx__SendAssetDetails__price">
                                {`$${dstAsset.priceUsd}`}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <IdenticonImg publicKey={destination} />
                          <div className="ReviewTx__SendDestinationDetails">
                            {truncatedDest}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ReviewTx__Warnings">
                  {shouldShowTxWarning && (
                    <BlockaidTxScanLabel
                      scanResult={txScanResult}
                      onClick={() => setActivePaneIndex(1)}
                    />
                  )}
                  {isRequiredMemoMissing && !isValidatingMemo && (
                    <MemoRequiredLabel onClick={() => setActivePaneIndex(2)} />
                  )}
                </div>
                <div className="ReviewTx__Details">
                  <div className="ReviewTx__Details__Row">
                    <div className="ReviewTx__Details__Row__Title">
                      <Icon.File02 />
                      {t("Memo")}
                    </div>
                    <div
                      className="ReviewTx__Details__Row__Value"
                      data-testid="review-tx-memo"
                    >
                      {memo || t("None")}
                    </div>
                  </div>
                  <div className="ReviewTx__Details__Row">
                    <div className="ReviewTx__Details__Row__Title">
                      <Icon.Route />
                      {t("Fee")}
                    </div>
                    <div
                      className="ReviewTx__Details__Row__Value"
                      data-testid="review-tx-fee"
                    >
                      {fee} XLM
                    </div>
                  </div>
                  <div className="ReviewTx__Details__Row">
                    <div className="ReviewTx__Details__Row__Title">
                      <Icon.FileCode02 />
                      {t("XDR")}
                    </div>
                    <div className="ReviewTx__Details__Row__Value">
                      <CopyValue
                        value={simulationState.data!.transactionXdr}
                        displayValue={simulationState.data!.transactionXdr}
                      />
                    </div>
                  </div>
                </div>
              </>,
              <BlockAidTxScanExpanded
                scanResult={txScanResult}
                srcAssetScanResult={srcAssetScanResult}
                dstAssetScanResult={dstAssetScanResult}
                srcAssetAddress={srcAssetAddress}
                dstAssetAddress={dstAssetAddress}
                onClose={() => setActivePaneIndex(0)}
              />,
            ]}
          />
          <div className="ReviewTx__Actions">
            {isRequiredMemoMissing && !isValidatingMemo && onAddMemo ? (
              <Button
                size="lg"
                isFullWidth
                isRounded
                variant="secondary"
                data-testid="AddMemoAction"
                onClick={(e) => {
                  e.preventDefault();
                  onAddMemo();
                }}
              >
                {t("Add Memo")}
              </Button>
            ) : (
              <Button
                size="lg"
                isFullWidth
                isRounded
                variant="secondary"
                data-testid="SubmitAction"
                disabled={isSubmitDisabled}
                isLoading={isValidatingMemo}
                onClick={(e) => {
                  e.preventDefault();
                  onConfirmTx();
                }}
              >
                {dstAsset && dest
                  ? `Swap ${asset.code} to ${dest.code}`
                  : `Send to ${truncatedDest}`}
              </Button>
            )}
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="tertiary"
              disabled={isValidatingMemo}
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
            >
              {t("Cancel")}
            </Button>
          </div>
        </div>
      )}
    </View.Content>
  );
};
