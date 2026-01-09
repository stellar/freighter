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
  BlockAidScanExpanded,
  MemoRequiredLabel,
} from "popup/components/WarningMessages";
import { useShouldTreatTxAsUnableToScan } from "popup/helpers/blockaid";
import { BlockAidScanTxResult } from "@shared/api/types";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { CopyValue } from "popup/components/CopyValue";
import { useValidateTransactionMemo } from "popup/helpers/useValidateTransactionMemo";
import { SecurityLevel } from "popup/constants/blockaid";
import { getBlockaidOverrideState } from "@shared/api/internal";
import { CollectibleInfoImage } from "popup/components/account/CollectibleInfo";

import "./styles.scss";

/**
 * Determines security level from transaction scan result, considering overrides
 */
const getTransactionSecurityLevel = (
  txScanResult: BlockAidScanTxResult | null | undefined,
  isUnableToScan: boolean,
  blockaidOverrideState: string | null,
): SecurityLevel | null => {
  // Check overrides first (takes precedence, dev mode only)
  if (blockaidOverrideState) {
    return blockaidOverrideState as SecurityLevel;
  }

  if (!txScanResult) {
    return isUnableToScan ? SecurityLevel.UNABLE_TO_SCAN : null;
  }

  const { simulation, validation } = txScanResult;

  // Handle simulation error - treat as suspicious
  if (simulation && "error" in simulation) {
    return SecurityLevel.SUSPICIOUS;
  }

  // Handle validation result
  if (validation && "result_type" in validation) {
    const resultType = validation.result_type;
    if (resultType === "Malicious") {
      return SecurityLevel.MALICIOUS;
    }
    if (resultType === "Warning") {
      return SecurityLevel.SUSPICIOUS;
    }
  }

  // Handle unable to scan
  if (isUnableToScan) {
    return SecurityLevel.UNABLE_TO_SCAN;
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
  const [blockaidAcknowledged, setBlockaidAcknowledged] = useState(false);

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

  // Scan transaction
  const txScanResult = simulationState.data?.scanResult;
  const shouldTreatTxAsUnableToScan = useShouldTreatTxAsUnableToScan();

  // Compute warning state once - used by both label and expanded components
  const isUnableToScan = shouldTreatTxAsUnableToScan(txScanResult);

  // Check override state (takes precedence, dev mode only)
  const [blockaidOverrideState, setBlockaidOverrideState] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    getBlockaidOverrideState()
      .then(setBlockaidOverrideState)
      .catch(() => setBlockaidOverrideState(null));
  }, []);

  // Determine security level (includes overrides - takes precedence on all panes)
  const securityLevel = getTransactionSecurityLevel(
    txScanResult,
    isUnableToScan,
    blockaidOverrideState,
  );

  const isMalicious = securityLevel === SecurityLevel.MALICIOUS;
  const isSuspicious = securityLevel === SecurityLevel.SUSPICIOUS;

  // Determine if transaction warning should be shown
  const hasSimulationData = !!simulationState.data;
  const shouldShowTxWarning =
    hasSimulationData && (isMalicious || isSuspicious || isUnableToScan);

  /**
   * Pane state machine:
   * - If Blockaid warning and not acknowledged: [Blockaid, Review, Memo]
   * - After Continue (ack): [Review, Memo, Blockaid]
   * - No warning: [Review, Memo]
   */
  const paneConfig = React.useMemo(
    () =>
      !shouldShowTxWarning
        ? {
            blockaidIndex: null,
            reviewIndex: 0,
            memoIndex: 1,
          }
        : !blockaidAcknowledged
          ? {
              blockaidIndex: 0,
              reviewIndex: 1,
              memoIndex: 2,
            }
          : {
              blockaidIndex: 2,
              reviewIndex: 0,
              memoIndex: 1,
            },
    [shouldShowTxWarning, blockaidAcknowledged],
  );

  // Track previous acknowledgment to avoid overriding manual navigation back to Blockaid
  const prevBlockaidAckRef = React.useRef(blockaidAcknowledged);

  // If there is any Blockaid warning, start on the Blockaid pane first; when first acknowledged, move to review
  React.useEffect(() => {
    const prevAck = prevBlockaidAckRef.current;

    if (shouldShowTxWarning && !blockaidAcknowledged) {
      setActivePaneIndex(paneConfig.blockaidIndex ?? 0);
    } else if (shouldShowTxWarning && blockaidAcknowledged && !prevAck) {
      setActivePaneIndex(paneConfig.reviewIndex);
    } else if (!shouldShowTxWarning && activePaneIndex !== 0) {
      setActivePaneIndex(0);
    }

    prevBlockaidAckRef.current = blockaidAcknowledged;
  }, [
    shouldShowTxWarning,
    blockaidAcknowledged,
    paneConfig.blockaidIndex,
    paneConfig.reviewIndex,
    activePaneIndex,
  ]);

  const isOnBlockaidPane =
    shouldShowTxWarning &&
    paneConfig.blockaidIndex !== null &&
    activePaneIndex === paneConfig.blockaidIndex;
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

  const renderSendAsset = () => {
    if (isCollectible) {
      return (
        <>
          <div className="ReviewTx__SendAsset__Collectible">
            <CollectibleInfoImage
              image={collectibleData.image}
              name={collectibleData.name}
              isSmall
            />
          </div>
          <div
            className="ReviewTx__SendAssetDetails"
            data-testid="review-tx-send-amount"
          >
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
                {collectibleData.collectionName} #{collectibleData.tokenId}
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
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
      </>
    );
  };

  const renderSendDestination = () => {
    if (dstAsset && dest) {
      return (
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
      );
    }

    return (
      <>
        <IdenticonImg publicKey={destination} />
        <div
          className="ReviewTx__SendDestinationDetails"
          data-testid="review-tx-send-destination-address"
        >
          {truncatedDest}
        </div>
      </>
    );
  };

  const reviewPane = (
    <>
      <div className="ReviewTx__Summary">
        <p>{title}</p>
        <div className="ReviewTx__SendSummary">
          <div className="ReviewTx__SendAsset">{renderSendAsset()}</div>
          <div className="ReviewTx__Divider">
            <Icon.ChevronDownDouble />
          </div>
          <div
            className="ReviewTx__SendDestination"
            data-testid="review-tx-send-destination"
          >
            {renderSendDestination()}
          </div>
        </div>
      </div>
      <div className="ReviewTx__Warnings">
        {shouldShowTxWarning && paneConfig.blockaidIndex !== null && (
          <BlockaidTxScanLabel
            scanResult={txScanResult}
            onClick={() => {
              if (paneConfig.blockaidIndex !== null) {
                setActivePaneIndex(paneConfig.blockaidIndex);
              }
            }}
          />
        )}
        {isRequiredMemoMissing && !isValidatingMemo && !shouldShowTxWarning && (
          <MemoRequiredLabel
            onClick={() => setActivePaneIndex(paneConfig.memoIndex)}
          />
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
    </>
  );

  const blockaidPane = (
    <BlockAidScanExpanded
      scanResult={txScanResult}
      onClose={() => {
        setBlockaidAcknowledged(true);
        setActivePaneIndex(paneConfig.reviewIndex);
      }}
    />
  );

  const memoPane = (
    <div className="ReviewTx__MemoDetails">
      <div className="ReviewTx__MemoDetails__Header">
        <div className="ReviewTx__MemoDetails__Header__Icon">
          <Icon.InfoOctagon className="WarningMessage__icon" />
        </div>
        <div
          className="ReviewTx__MemoDetails__Header__Close"
          onClick={() => setActivePaneIndex(paneConfig.reviewIndex)}
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
    </div>
  );

  // Build panes in order (no hooks on JSX)
  const panes: React.ReactNode[] = [];
  if (shouldShowTxWarning) {
    if (!blockaidAcknowledged) {
      panes.push(blockaidPane, reviewPane, memoPane);
    } else {
      panes.push(reviewPane, memoPane, blockaidPane);
    }
  } else {
    panes.push(reviewPane, memoPane);
  }

  /**
   * Renders the appropriate action buttons based on the current pane state.
   *
   * Pane Logic Priority (highest to lowest):
   * 1. Blockaid pane: User must acknowledge warnings before proceeding
   * 2. Memo required but missing: User must add memo before proceeding
   * 3. Transaction warnings present: User can proceed with caution
   * 4. Normal case: Standard confirm/cancel flow
   */
  const renderActionButtons = () => {
    // 1. Blockaid pane: Cancel (primary) and Continue (text) to proceed to review
    if (isOnBlockaidPane) {
      return (
        <>
          <Button
            size="lg"
            isFullWidth
            isRounded
            variant={isMalicious ? "destructive" : "secondary"}
            data-testid="CancelAction"
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
          >
            {t("Cancel")}
          </Button>
          <button
            type="button"
            className={`ReviewTx__TextAction ReviewTx__TextAction--${
              isMalicious ? "error" : "default"
            }`}
            data-testid="ContinueAction"
            onClick={(e) => {
              e.preventDefault();
              setBlockaidAcknowledged(true);
              setActivePaneIndex(paneConfig.reviewIndex);
            }}
          >
            {t("Continue")}
          </button>
        </>
      );
    }

    // 2. Memo required but missing (only when no security warnings): Add Memo (primary) and Cancel (secondary)
    if (
      isRequiredMemoMissing &&
      !isValidatingMemo &&
      onAddMemo &&
      !shouldShowTxWarning
    ) {
      return (
        <>
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
        </>
      );
    }

    // 3. Transaction warnings acknowledged: Cancel (destructive for malicious, secondary otherwise) and "Confirm anyway" (text)
    if (shouldShowTxWarning) {
      return (
        <>
          <Button
            size="lg"
            isFullWidth
            isRounded
            variant={isMalicious ? "destructive" : "secondary"}
            data-testid="CancelAction"
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
          >
            {t("Cancel")}
          </Button>
          <button
            type="button"
            className={`ReviewTx__TextAction ReviewTx__TextAction--${
              isMalicious ? "error" : "default"
            }`}
            data-testid="SubmitAction"
            onClick={(e) => {
              e.preventDefault();
              onConfirmTx();
            }}
          >
            {t("Confirm anyway")}
          </button>
        </>
      );
    }

    // 4. Normal case: Confirm (primary) and Cancel (secondary)
    return (
      <>
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
      </>
    );
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
          <MultiPaneSlider activeIndex={activePaneIndex} panes={panes} />
          <div className="ReviewTx__Actions">{renderActionButtons()}</div>
        </div>
      )}
    </View.Content>
  );
};
