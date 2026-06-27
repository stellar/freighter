import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Icon, Notification } from "@stellar/design-system";

import { NetworkDetails } from "@shared/constants/stellar";
import { BlockAidScanTxResult } from "@shared/api/types";
import { RequestState, State } from "constants/request";
import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  getAssetFromCanonical,
  truncatedFedAddress,
  truncatedPublicKey,
} from "helpers/stellar";
import { getContractIdFromTransactionData } from "popup/helpers/soroban";
import {
  checkIsMuxedSupported,
  getMemoDisabledState,
} from "helpers/muxedAddress";
import { SimulateTxData } from "types/transactions";
import { View } from "popup/basics/layout/View";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { useValidateTransactionMemo } from "popup/helpers/useValidateTransactionMemo";
import { SecurityLevel, mergeSecurityLevels } from "popup/constants/blockaid";
import {
  useBlockaidOverrideState,
  useShouldTreatTxAsUnableToScan,
} from "popup/helpers/blockaid";
import {
  BlockaidTxScanLabel,
  BlockAidScanExpanded,
  MemoRequiredLabel,
} from "popup/components/WarningMessages";
import { CopyValue } from "popup/components/CopyValue";
import { TruncatedMemo } from "popup/components/TruncatedMemo";
import { trackSendFeeBreakdownOpened } from "popup/metrics/send";
import { FeesPane } from "popup/components/InternalTransaction/FeesPane";
import { ActionButtons } from "./components/ActionButtons";
import { SendAsset, SendDestination } from "./components";
import { TrustlineBanner } from "./components/TrustlineBanner";
import { TrustlineInfoSheet } from "./components/TrustlineInfoSheet";
import { SwapRateRow } from "./components/SwapRateRow";

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
  destinationTokenDetails?: {
    tokenCode: string;
    requiresTrustline: boolean;
    decimals: number;
    issuer?: string;
    // Blockaid verdict captured when the destination token was picked; folded
    // into the review security gate alongside the transaction scan (§4.1).
    securityLevel?: SecurityLevel;
  } | null;
  // Blockaid verdict for the swap source token (from its held balance); folded
  // into the same review gate so a flagged sell token also warns (§4.3).
  sourceTokenSecurityLevel?: SecurityLevel;
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
  destinationTokenDetails,
  sourceTokenSecurityLevel,
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
  // A destination asset is only present on swaps; Send has a recipient address.
  const isSwap = !!dstAsset;
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
  const blockaidOverrideState = useBlockaidOverrideState();

  // Transaction-scan verdict (includes overrides - takes precedence on all panes)
  const txSecurityLevel = getTransactionSecurityLevel(
    txScanResult,
    isUnableToScan,
    blockaidOverrideState,
  );

  // Roll the destination token's Blockaid verdict into the gate so a malicious /
  // suspicious / unable-to-scan token warns and requires "Confirm anyway" — not
  // only a flagged transaction (§4.1). Send passes no token level, so this
  // reduces to the transaction verdict and leaves the Send gate unchanged.
  const destTokenSecurityLevel = destinationTokenDetails?.securityLevel ?? null;
  const securityLevel = mergeSecurityLevels([
    txSecurityLevel,
    sourceTokenSecurityLevel ?? null,
    destTokenSecurityLevel,
  ]);

  const isMalicious = securityLevel === SecurityLevel.MALICIOUS;
  const isSuspicious = securityLevel === SecurityLevel.SUSPICIOUS;

  // Determine if a security warning should be shown (tx- or token-driven)
  const shouldShowTxWarning =
    isMalicious ||
    isSuspicious ||
    securityLevel === SecurityLevel.UNABLE_TO_SCAN;

  // Banner copy for a flagged destination token (null when the token is clean
  // or its verdict is already covered by the transaction-scan banner).
  const destTokenWarningMessage =
    destTokenSecurityLevel === SecurityLevel.MALICIOUS
      ? t("The token you're receiving was flagged as malicious by Blockaid.")
      : destTokenSecurityLevel === SecurityLevel.SUSPICIOUS
        ? t("The token you're receiving was flagged as suspicious by Blockaid.")
        : destTokenSecurityLevel === SecurityLevel.UNABLE_TO_SCAN
          ? t(
              "The token you're receiving couldn't be scanned for security risks.",
            )
          : null;

  const sourceTokenWarningMessage =
    sourceTokenSecurityLevel === SecurityLevel.MALICIOUS
      ? t("The token you're sending was flagged as malicious by Blockaid.")
      : sourceTokenSecurityLevel === SecurityLevel.SUSPICIOUS
        ? t("The token you're sending was flagged as suspicious by Blockaid.")
        : sourceTokenSecurityLevel === SecurityLevel.UNABLE_TO_SCAN
          ? t(
              "The token you're sending couldn't be scanned for security risks.",
            )
          : null;

  /**
   * Pane state machine:
   * - No warning: [Review (0), Memo (1), Fees (2)]
   * - With Blockaid warning: [Review (0), Memo (1), Blockaid (2), Fees (3)] - Blockaid accessible via banner click
   */
  const paneConfig = React.useMemo(
    () =>
      !shouldShowTxWarning
        ? {
            blockaidIndex: null,
            reviewIndex: 0,
            memoIndex: 1,
            feesIndex: 2,
          }
        : {
            blockaidIndex: 2,
            reviewIndex: 0,
            memoIndex: 1,
            feesIndex: 3,
          },
    [shouldShowTxWarning],
  );

  const isOnBlockaidPane =
    paneConfig.blockaidIndex !== null &&
    activePaneIndex === paneConfig.blockaidIndex;

  const isOnFeesPane = activePaneIndex === paneConfig.feesIndex;

  const requiresTrustline = !!destinationTokenDetails?.requiresTrustline;
  const [isOnTrustlinePane, setIsOnTrustlinePane] = useState(false);

  // Extract contract ID for custom tokens or collectibles
  const contractId = React.useMemo(
    () =>
      getContractIdFromTransactionData({
        isCollectible,
        collectionAddress: collectibleData?.collectionAddress || "",
        isToken,
        asset: srcAsset,
        networkDetails,
      }),
    [
      isCollectible,
      collectibleData?.collectionAddress,
      isToken,
      srcAsset,
      networkDetails,
    ],
  );

  // Check if contract supports muxed addresses
  const [contractSupportsMuxed, setContractSupportsMuxed] = React.useState<
    boolean | null
  >(null);

  React.useEffect(() => {
    const checkContract = async () => {
      if ((!isToken && !isCollectible) || !contractId || !networkDetails) {
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
  }, [isToken, isCollectible, contractId, networkDetails]);

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

  const reviewPane = (
    <>
      <div className="ReviewTx__Summary">
        <p>{title}</p>
        <div className="ReviewTx__SendSummary">
          <div className="ReviewTx__SendAsset">
            <SendAsset
              isCollectible={isCollectible}
              collectibleData={collectibleData}
              assetIcons={assetIcons}
              asset={asset}
              assetIcon={assetIcon}
              sendAmount={sendAmount}
              networkDetails={networkDetails}
              sendPriceUsd={sendPriceUsd}
            />
          </div>
          <div className="ReviewTx__Divider">
            <Icon.ChevronDownDouble />
          </div>
          <div
            className="ReviewTx__SendDestination"
            data-testid="review-tx-send-destination"
          >
            <SendDestination
              dstAsset={dstAsset}
              dest={dest}
              networkDetails={networkDetails}
              destination={destination}
              truncatedDest={truncatedDest}
            />
          </div>
        </div>
      </div>
      <div className="ReviewTx__Warnings">
        {/* Transaction-scan banner (opens the expandable Blockaid pane). Gated
            on the tx verdict so a token-only warning doesn't open an empty
            pane — the token verdict gets its own banner below. */}
        {txSecurityLevel && paneConfig.blockaidIndex !== null && (
          <BlockaidTxScanLabel
            scanResult={txScanResult}
            onClick={() => {
              if (paneConfig.blockaidIndex !== null) {
                setActivePaneIndex(paneConfig.blockaidIndex);
              }
            }}
          />
        )}
        {sourceTokenWarningMessage && (
          <div
            className="ReviewTx__Warnings__token"
            data-testid="review-tx-source-token-warning"
          >
            <Notification
              variant={
                sourceTokenSecurityLevel === SecurityLevel.MALICIOUS
                  ? "error"
                  : "warning"
              }
              title={sourceTokenWarningMessage}
            />
          </div>
        )}
        {destTokenWarningMessage && (
          <div
            className="ReviewTx__Warnings__token"
            data-testid="review-tx-dest-token-warning"
          >
            <Notification
              variant={
                destTokenSecurityLevel === SecurityLevel.MALICIOUS
                  ? "error"
                  : "warning"
              }
              title={destTokenWarningMessage}
            />
          </div>
        )}
        {isRequiredMemoMissing && !isValidatingMemo && !shouldShowTxWarning && (
          <MemoRequiredLabel
            onClick={() => setActivePaneIndex(paneConfig.memoIndex)}
          />
        )}
        {requiresTrustline && (
          <TrustlineBanner
            tokenCode={destinationTokenDetails!.tokenCode}
            onClick={() => setIsOnTrustlinePane(true)}
          />
        )}
      </div>
      <div className="ReviewTx__Details">
        {/* Swaps don't carry a memo; hide the row entirely. For Send, hide it
            only when memo is disabled (e.g., for all M addresses). */}
        {!isSwap && !isMemoDisabled && (
          <div className="ReviewTx__Details__Row ReviewTx__Details__Row--memo">
            <div className="ReviewTx__Details__Row__Title">
              <Icon.File02 />
              {t("Memo")}
            </div>
            <div className="ReviewTx__Details__Row__Value ReviewTx__Details__Row__Value--memo">
              <TruncatedMemo
                memo={memo}
                className="ReviewTx__Memo"
                data-testid="review-tx-memo"
              />
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
            <button
              type="button"
              className="ReviewTx__Details__Row__FeesInfoBtn"
              data-testid="review-tx-fee-info-btn"
              onClick={() => {
                trackSendFeeBreakdownOpened("review");
                setActivePaneIndex(paneConfig.feesIndex);
              }}
              aria-label={t("Fee breakdown")}
            >
              <Icon.InfoCircle />
            </button>
            {fee} XLM
          </div>
        </div>
        {dstAsset && dest && (
          <SwapRateRow
            srcCode={asset.code}
            dstCode={dest.code}
            sendAmount={sendAmount}
            destinationAmount={dstAsset.amount}
          />
        )}
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

  const feesPane = (
    <FeesPane
      fee={fee}
      simulationState={simulationState}
      isSoroban={isToken || isCollectible}
      onClose={() => setActivePaneIndex(paneConfig.reviewIndex)}
    />
  );

  // Build panes in order (no hooks on JSX). The trustline info is a slide-up
  // sheet overlay (rendered below), not a pane.
  const panes: React.ReactNode[] = shouldShowTxWarning
    ? [reviewPane, memoPane, blockaidPane, feesPane]
    : [reviewPane, memoPane, feesPane];

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
          <TrustlineInfoSheet
            isOpen={isOnTrustlinePane}
            tokenCode={destinationTokenDetails?.tokenCode || ""}
            onClose={() => setIsOnTrustlinePane(false)}
          />
          {!isOnFeesPane && !isOnTrustlinePane && (
            <div className="ReviewTx__Actions">
              <ActionButtons
                isOnBlockaidPane={isOnBlockaidPane}
                isMalicious={isMalicious}
                isRequiredMemoMissing={isRequiredMemoMissing}
                isValidatingMemo={isValidatingMemo}
                onAddMemo={onAddMemo}
                shouldShowTxWarning={shouldShowTxWarning}
                onCancel={onCancel}
                onConfirmTx={onConfirmTx}
                paneConfig={paneConfig}
                isSubmitDisabled={isSubmitDisabled}
                dstAsset={dstAsset}
                dest={dest}
                asset={asset}
                truncatedDest={truncatedDest}
                setActivePaneIndex={setActivePaneIndex}
              />
            </div>
          )}
        </div>
      )}
    </View.Content>
  );
};
