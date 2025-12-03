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
  isMuxedAccount,
  truncatedFedAddress,
  truncatedPublicKey,
} from "helpers/stellar";
import {
  isSorobanTransaction,
  getContractIdFromTokenId,
} from "popup/helpers/soroban";
import { checkContractMuxedSupport } from "helpers/muxedAddress";

import { SimulateTxData } from "popup/components/sendPayment/SendAmount/hooks/useSimulateTxData";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  BlockaidTxScanLabel,
  BlockAidTxScanExpanded,
  MemoRequiredLabel,
} from "popup/components/WarningMessages";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { CopyValue } from "popup/components/CopyValue";
import { useValidateTransactionMemo } from "popup/helpers/useValidateTransactionMemo";

import "./styles.scss";

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
  const [contractSupportsMuxed, setContractSupportsMuxed] = useState<
    boolean | null
  >(null);

  const {
    hardwareWalletData: { status: hwStatus },
    transactionData: { destination, memo, federationAddress, isToken },
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
  const isRecipientMuxed = destination ? isMuxedAccount(destination) : false;

  // Extract contract ID from asset for custom tokens
  const contractId = React.useMemo(() => {
    if (!isToken) {
      return undefined;
    }
    return getContractIdFromTokenId(srcAsset);
  }, [isToken, srcAsset]);

  // Check if contract supports muxed addresses (Soroban mux support) for custom tokens
  React.useEffect(() => {
    const checkContract = async () => {
      if (!isToken || !destination || !contractId || !networkDetails) {
        setContractSupportsMuxed(null);
        return;
      }

      try {
        const supportsMuxed = await checkContractMuxedSupport({
          contractId,
          networkDetails,
        });
        setContractSupportsMuxed(supportsMuxed);
      } catch (error) {
        // On error, assume no support for safety
        console.error("Error checking contract muxed support:", error);
        setContractSupportsMuxed(false);
      }
    };

    checkContract();
  }, [isToken, destination, contractId, networkDetails]);

  // Check if contract supports muxed addresses (Soroban mux support) for custom tokens
  React.useEffect(() => {
    const checkContract = async () => {
      if (!isToken || !destination || !contractId || !networkDetails) {
        setContractSupportsMuxed(null);
        return;
      }

      try {
        const supportsMuxed = await checkContractMuxedSupport({
          contractId,
          networkDetails,
        });
        setContractSupportsMuxed(supportsMuxed);
      } catch (error) {
        // On error, assume no support for safety
        console.error("Error checking contract muxed support:", error);
        setContractSupportsMuxed(false);
      }
    };

    checkContract();
  }, [isToken, destination, contractId, networkDetails]);

  // Check if this is a Soroban transaction
  const isSorobanTx = isSorobanTransaction({
    recipientAddress: destination,
    isToken,
    contractId,
  });

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
                  {simulationState.data?.scanResult && (
                    <BlockaidTxScanLabel
                      scanResult={simulationState.data?.scanResult}
                      onClick={() => setActivePaneIndex(1)}
                    />
                  )}
                  {isRequiredMemoMissing && !isValidatingMemo && (
                    <MemoRequiredLabel onClick={() => setActivePaneIndex(2)} />
                  )}
                </div>
                <div className="ReviewTx__Details">
                  {/* Hide memo row for:
                      - Soroban transactions with muxed addresses (memo encoded in address)
                      - Tokens without Soroban mux support (contractSupportsMuxed === false) - no memo support
                      Normal transactions support M address + memo */}
                  {!(
                    (isRecipientMuxed && isSorobanTx) ||
                    (isToken && contractSupportsMuxed === false)
                  ) && (
                    <div className="ReviewTx__Details__Row">
                      <div className="ReviewTx__Details__Row__Title">
                        <Icon.File02 />
                        Memo
                      </div>
                      <div
                        className="ReviewTx__Details__Row__Value"
                        data-testid="review-tx-memo"
                      >
                        {memo || "None"}
                      </div>
                    </div>
                  )}
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
                scanResult={simulationState.data?.scanResult!}
                onClose={() => setActivePaneIndex(0)}
              />,
              <div className="ReviewTx__MemoDetails">
                <div className="ReviewTx__MemoDetails__Header">
                  <div className="ReviewTx__MemoDetails__Header__Icon">
                    <Icon.InfoOctagon className="WarningMessage__icon" />
                  </div>
                  <div
                    className="ReviewTx__MemoDetails__Header__Close"
                    onClick={() => setActivePaneIndex(0)}
                  >
                    <Icon.X />
                  </div>
                </div>
                <div className="ReviewTx__MemoDetails__Title">
                  <span>{t("Memo is required")}</span>
                </div>
                <div className="ReviewTx__MemoDetails__Content">
                  <div className="ReviewTx__MemoDetails__Text">
                    {t(
                      "Some destination accounts on the Stellar network require a memo to identify your payment.",
                    )}
                  </div>
                  <div className="ReviewTx__MemoDetails__Text">
                    {t(
                      "If a required memo is missing or incorrect, your funds may not reach the intended recipient.",
                    )}
                  </div>
                </div>
              </div>,
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
