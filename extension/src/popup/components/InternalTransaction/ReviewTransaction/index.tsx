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
import { SimulateTxData } from "popup/components/send/SendAmount/hooks/useSimulateTxData";
import { View } from "popup/basics/layout/View";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { MultiPaneSlider } from "popup/components/SlidingPaneSwitcher";
import { useValidateTransactionMemo } from "popup/helpers/useValidateTransactionMemo";
import { SecurityLevel } from "popup/constants/blockaid";
import { getBlockaidOverrideState } from "@shared/api/internal";
import {
  BlockaidTxScanLabel,
  BlockAidScanExpanded,
  MemoRequiredLabel,
} from "popup/components/WarningMessages";
import { CopyValue } from "popup/components/CopyValue";
import { useShouldTreatTxAsUnableToScan } from "popup/helpers/blockaid";
import { ActionButtons } from "./components/ActionButtons";
import { SendAsset, SendDestination } from "./components";

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
  const shouldShowTxWarning = isMalicious || isSuspicious || isUnableToScan;

  /**
   * Pane state machine:
   * - With Blockaid warning: [Review, Memo, Blockaid] - Blockaid accessible via banner click
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
        : {
            blockaidIndex: 2,
            reviewIndex: 0,
            memoIndex: 1,
          },
    [shouldShowTxWarning],
  );

  const isOnBlockaidPane =
    paneConfig.blockaidIndex !== null &&
    activePaneIndex === paneConfig.blockaidIndex;

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
    panes.push(reviewPane, memoPane, blockaidPane);
  } else {
    panes.push(reviewPane, memoPane);
  }

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
        </div>
      )}
    </View.Content>
  );
};
