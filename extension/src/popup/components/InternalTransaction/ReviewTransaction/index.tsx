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
import { getContractIdFromTokenId } from "popup/helpers/soroban";
import {
  checkIsMuxedSupported,
  getMemoDisabledState,
} from "helpers/muxedAddress";
import { SimulateTxData } from "popup/components/send/SendAmount/hooks/useSimulateTxData";
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
import { CollectibleInfoImage } from "popup/components/account/CollectibleInfo";

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

  const {
    hardwareWalletData: { status: hwStatus },
    transactionData: {
      destination,
      memo,
      federationAddress,
      isToken,
      isCollectible,
      collectibleData,
    },
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

  // Extract contract ID from asset for custom tokens
  const contractId = React.useMemo(() => {
    if (!isToken) {
      return undefined;
    }
    return getContractIdFromTokenId(srcAsset, networkDetails);
  }, [isToken, srcAsset, networkDetails]);

  // Check if contract supports muxed addresses
  const [contractSupportsMuxed, setContractSupportsMuxed] = React.useState<
    boolean | null
  >(null);

  React.useEffect(() => {
    const checkContract = async () => {
      if (!isToken || !contractId || !networkDetails) {
        setContractSupportsMuxed(null);
        return;
      }

      try {
        const supportsMuxed = await checkIsMuxedSupported({
          contractId,
          networkDetails,
        });
        setContractSupportsMuxed(supportsMuxed);
      } catch (error) {
        // On error, assume no support for safety
        setContractSupportsMuxed(false);
      }
    };

    checkContract();
  }, [isToken, contractId, networkDetails]);

  // Get memo disabled state using the helper
  const memoDisabledState = React.useMemo(() => {
    if (!destination) {
      return { isMemoDisabled: false, memoDisabledMessage: undefined };
    }
    return getMemoDisabledState({
      targetAddress: destination,
      contractId,
      contractSupportsMuxed,
      networkDetails,
      t,
    });
  }, [destination, contractId, contractSupportsMuxed, networkDetails, t]);

  const { isMemoDisabled } = memoDisabledState;

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
                      {isCollectible ? (
                        <div className="ReviewTx__SendAsset__Collectible">
                          <CollectibleInfoImage
                            image={collectibleData.image}
                            name={collectibleData.name}
                            isSmall
                          />
                        </div>
                      ) : (
                        <AssetIcon
                          assetIcons={assetIcons}
                          code={asset.code}
                          issuerKey={asset.issuer}
                          icon={assetIcon}
                          isSuspicious={false}
                        />
                      )}
                      <div
                        className="ReviewTx__SendAssetDetails"
                        data-testid="review-tx-send-amount"
                      >
                        {isCollectible ? (
                          <div className="ReviewTx__SendAsset__Collectible__label">
                            <div
                              className="ReviewTx__SendAsset__Collectible__label__name"
                              data-testid="review-tx-send-asset-collectible-name"
                            >
                              {collectibleData.name}
                            </div>
                            <div
                              className="ReviewTx__SendAsset__Collectible__label__id"
                              data-testid="review-tx-send-asset-collectible-collection-name"
                            >
                              {collectibleData.collectionName} #
                              {collectibleData.tokenId}
                            </div>
                          </div>
                        ) : (
                          <>
                            <span>
                              {sendAmount} {asset.code}
                            </span>
                            {isMainnet(networkDetails) && sendPriceUsd && (
                              <span className="ReviewTx__SendAssetDetails__price">
                                {`$${sendPriceUsd}`}
                              </span>
                            )}
                          </>
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
                          <div
                            className="ReviewTx__SendDestinationDetails"
                            data-testid="review-tx-send-destination-address"
                          >
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
                  {/* Hide memo row when memo is disabled (e.g., for all M addresses) */}
                  {!isMemoDisabled && (
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
