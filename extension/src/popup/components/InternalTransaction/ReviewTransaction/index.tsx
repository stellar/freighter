import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Icon, Notification } from "@stellar/design-system";
import {
  Operation,
  OperationRecord,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { BlockAidScanTxResult } from "@shared/api/types";
import { OPERATION_TYPES } from "constants/transaction";
import { decodeMemo } from "popup/helpers/parseTransaction";
import { Summary } from "popup/views/SignTransaction/Preview/Summary";
import { Details } from "popup/views/SignTransaction/Preview/Details";
import { AuthEntries } from "popup/components/AuthEntry";
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
import {
  getContractIdFromTransactionData,
  getAuthEntryBoundAddress,
} from "popup/helpers/soroban";
import {
  checkIsMuxedSupported,
  getMemoDisabledState,
} from "helpers/muxedAddress";
import { SimulateTxData } from "types/transactions";
import { View } from "popup/basics/layout/View";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { useValidateTransactionMemo } from "popup/helpers/useValidateTransactionMemo";
import {
  BlockaidWarning,
  SecurityLevel,
  mergeSecurityLevels,
} from "popup/constants/blockaid";
import {
  useBlockaidOverrideState,
  useShouldTreatTxAsUnableToScan,
} from "popup/helpers/blockaid";
import {
  BlockAidScanExpanded,
  MemoRequiredLabel,
} from "popup/components/WarningMessages";
import { BlockaidBanner } from "popup/components/BlockaidBanner";
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
    // Friendly per-feature reasons from the destination token scan, listed in
    // the expandable Blockaid pane next to the transaction-scan reasons (§ batch4
    // task 3).
    securityWarnings?: BlockaidWarning[];
  } | null;
  // Blockaid verdict for the swap source token (from its held balance); folded
  // into the same review gate so a flagged sell token also warns (§4.3).
  sourceTokenSecurityLevel?: SecurityLevel;
  // Friendly per-feature reasons from the source token scan, listed in the
  // expandable Blockaid pane alongside the transaction-scan reasons (§ batch4
  // task 3).
  sourceTokenSecurityWarnings?: BlockaidWarning[];
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
  sourceTokenSecurityWarnings,
}: ReviewTxProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;

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

  // Parse the XDR into a Transaction so the "Transaction details" sheet can show
  // the full per-operation breakdown (reusing the dapp-signing Summary/Details
  // components, which take plain props) — § batch4 follow-up. Mirrors how
  // SignTransaction builds its details view.
  const detailTx = React.useMemo(() => {
    if (!transactionXdr) {
      return null;
    }
    try {
      const parsed = TransactionBuilder.fromXDR(
        transactionXdr,
        networkDetails.networkPassphrase,
      );
      // Fee-bump envelopes have no operations/sequence/memo of their own; the
      // internal Send/Swap flow never builds them, but guard so the cast is
      // safe rather than asserting.
      if ("innerTransaction" in parsed) {
        return null;
      }
      return parsed as Transaction;
    } catch (e) {
      return null;
    }
  }, [transactionXdr, networkDetails.networkPassphrase]);
  const detailDecodedMemo = detailTx ? decodeMemo(detailTx.memo) : undefined;
  const detailHasAuthEntries = !!detailTx?.operations.some(
    (op) => op.type === "invokeHostFunction" && op.auth && op.auth.length,
  );
  const [isOnDetailsPane, setIsOnDetailsPane] = useState(false);

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

  // We show at most ONE Blockaid banner, by priority (mirrors mobile's
  // useReviewSecuritySummary): the transaction verdict outranks the token
  // verdict, and among tokens the worse level wins (the destination breaks a
  // tie, since it's the token being acquired). When the transaction scan itself
  // is flagged its banner renders below; otherwise this single token banner
  // does.
  const tokenWarningLevel = mergeSecurityLevels([
    sourceTokenSecurityLevel ?? null,
    destTokenSecurityLevel,
  ]);
  const tokenWarningMessage =
    destTokenSecurityLevel && destTokenSecurityLevel === tokenWarningLevel
      ? destTokenWarningMessage
      : sourceTokenSecurityLevel &&
          sourceTokenSecurityLevel === tokenWarningLevel
        ? sourceTokenWarningMessage
        : null;

  // Token-scan reasons (source + destination) shown in the expandable pane next
  // to the transaction-scan reasons, so the user sees every flagged reason in
  // one list, like mobile (§ batch4 task 3).
  const tokenSecurityWarnings: BlockaidWarning[] = [
    ...(sourceTokenSecurityWarnings ?? []),
    ...(destinationTokenDetails?.securityWarnings ?? []),
  ];

  // Which single Blockaid banner to render, by mobile's priority cascade
  // (useReviewSecuritySummary): tx-malicious > tx-suspicious > token-malicious
  // > token-suspicious > any unable-to-scan. Critically, a flagged TOKEN
  // outranks a tx that merely couldn't be scanned (common on mainnet when the
  // scan is absent), so we don't downgrade a malicious-token warning to the
  // soft "proceed with caution". Only the tx banner opens the expandable pane.
  const blockaidBannerKind: "tx" | "token" | null = (() => {
    if (
      txSecurityLevel === SecurityLevel.MALICIOUS ||
      txSecurityLevel === SecurityLevel.SUSPICIOUS
    ) {
      return "tx";
    }
    if (
      tokenWarningLevel === SecurityLevel.MALICIOUS ||
      tokenWarningLevel === SecurityLevel.SUSPICIOUS
    ) {
      return "token";
    }
    if (txSecurityLevel && shouldShowTxWarning) {
      return "tx"; // tx unable-to-scan
    }
    if (tokenWarningMessage) {
      return "token"; // token unable-to-scan only
    }
    return null;
  })();

  // The single severity that drives the unified banner's color and copy: the
  // transaction verdict for a tx banner, otherwise the worst token verdict.
  const bannerSecurityLevel =
    blockaidBannerKind === "tx" ? txSecurityLevel : tokenWarningLevel;

  // The detail sheets (Blockaid "Do not proceed", fee breakdown, memo,
  // trustline) all render IN-FLOW over the review body — each gated by its own
  // boolean — so they appear in place instead of sliding in from the side
  // (§ batch4 follow-up). The review body is the only horizontal-slider pane,
  // so the slider is gone entirely.
  const [isOnBlockaidSheet, setIsOnBlockaidSheet] = useState(false);
  const openBlockaidSheet = () => setIsOnBlockaidSheet(true);
  const [isOnFeesPane, setIsOnFeesPane] = useState(false);
  const [isOnMemoPane, setIsOnMemoPane] = useState(false);

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
              isSuspicious={
                sourceTokenSecurityLevel === SecurityLevel.MALICIOUS ||
                sourceTokenSecurityLevel === SecurityLevel.SUSPICIOUS
              }
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
              isSuspicious={
                destTokenSecurityLevel === SecurityLevel.MALICIOUS ||
                destTokenSecurityLevel === SecurityLevel.SUSPICIOUS
              }
            />
          </div>
        </div>
      </div>
      <div className="ReviewTx__Warnings">
        {/* Exactly one Blockaid banner, chosen by blockaidBannerKind (mobile
            priority). Both kinds open the in-flow "Do not proceed" sheet. */}
        {blockaidBannerKind && bannerSecurityLevel ? (
          <BlockaidBanner
            securityLevel={bannerSecurityLevel}
            entity={
              blockaidBannerKind === "tx" ? "transaction" : "tokenAggregate"
            }
            onClick={openBlockaidSheet}
            dataTestId={
              blockaidBannerKind === "tx"
                ? "review-tx-blockaid-warning"
                : "review-tx-token-warning"
            }
          />
        ) : null}
        {isRequiredMemoMissing && !isValidatingMemo && !shouldShowTxWarning && (
          <MemoRequiredLabel onClick={() => setIsOnMemoPane(true)} />
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
                setIsOnFeesPane(true);
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
        {/* The raw XDR now lives in the "Transaction details" sheet (Summary),
            so it's no longer duplicated as a row here (§ batch4 follow-up). */}
      </div>
      {detailTx && (
        <button
          type="button"
          className="ReviewTx__TxDetailsBtn"
          data-testid="review-tx-details-btn"
          onClick={() => setIsOnDetailsPane(true)}
        >
          <Icon.List />
          <span>{t("Transaction details")}</span>
        </button>
      )}
    </>
  );
  // The token banner always opens the sheet (even for an unable-to-scan token
  // with no per-feature reasons), so fall back to the consolidated banner
  // message when there are no friendly reasons — otherwise the sheet would have
  // nothing to show (§ batch4 follow-up).
  const blockaidSheetExtraWarnings: BlockaidWarning[] =
    tokenSecurityWarnings.length > 0
      ? tokenSecurityWarnings
      : blockaidBannerKind === "token" && tokenWarningMessage
        ? [
            {
              description: tokenWarningMessage,
              isError: tokenWarningLevel === SecurityLevel.MALICIOUS,
            },
          ]
        : [];

  const blockaidPane = (
    <BlockAidScanExpanded
      scanResult={txScanResult}
      extraWarnings={blockaidSheetExtraWarnings}
      extraSeverityLevel={tokenWarningLevel}
      onClose={() => setIsOnBlockaidSheet(false)}
    />
  );

  const memoPane = (
    <div className="ReviewTx__MemoDetails">
      <div className="ReviewTx__MemoDetails__Header">
        <div className="ReviewTx__MemoDetails__Header__Icon">
          <Icon.InfoOctagon className="WarningMessage__icon" />
        </div>
        <button
          type="button"
          className="ReviewTx__MemoDetails__Header__Close"
          data-testid="review-tx-memo-close-btn"
          aria-label={t("Close")}
          onClick={() => setIsOnMemoPane(false)}
        >
          <Icon.X />
        </button>
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
      onClose={() => setIsOnFeesPane(false)}
    />
  );

  // The full transaction breakdown (operations, fees, sequence, memo, XDR),
  // reusing the dapp-signing Summary/Details/AuthEntries components. Internal
  // txns have no flaggedKeys, so an empty object is passed (the warnings just
  // no-op) and memo is never required here (§ batch4 follow-up).
  const detailsPane = detailTx ? (
    <div className="ReviewTx__TxDetails" data-testid="review-tx-details-pane">
      <div className="ReviewTx__TxDetails__Header">
        <div className="DetailsMark">
          <Icon.List />
        </div>
        <button
          type="button"
          className="Close"
          data-testid="review-tx-details-close-btn"
          aria-label={t("Close")}
          onClick={() => setIsOnDetailsPane(false)}
        >
          <Icon.X />
        </button>
      </div>
      <div className="ReviewTx__TxDetails__Title">
        <span>{t("Transaction details")}</span>
      </div>
      <div className="ReviewTx__TxDetails__Summary">
        <Summary
          sequenceNumber={detailTx.sequence}
          fee={detailTx.fee}
          memo={detailDecodedMemo}
          xdr={transactionXdr!}
          operationNames={detailTx.operations.map(
            (op) =>
              OPERATION_TYPES[op.type as keyof typeof OPERATION_TYPES] ||
              op.type,
          )}
        />
      </div>
      {detailHasAuthEntries && (
        <AuthEntries
          entries={
            (detailTx.operations[0] as Operation.InvokeHostFunction).auth?.map(
              (authEntry) => ({
                invocation: authEntry.rootInvocation(),
                boundAddress: getAuthEntryBoundAddress(authEntry),
              }),
            ) || []
          }
        />
      )}
      <Details
        operations={detailTx.operations as unknown as OperationRecord[]}
        flaggedKeys={{}}
        isMemoRequired={false}
        scanAssets={false}
      />
    </div>
  ) : null;

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
          {/* Every detail view (trustline, Blockaid, fees, memo) replaces the
              review body in-flow while open, and the body returns when it
              closes. Rendered in-flow rather than as nested modals/horizontal
              slider panes so they aren't clipped by the self-measuring review
              modal and appear in place (§ batch3 task 4, § batch4 follow-up). */}
          {isOnTrustlinePane ? (
            <TrustlineInfoSheet
              tokenCode={destinationTokenDetails?.tokenCode || ""}
              onClose={() => setIsOnTrustlinePane(false)}
            />
          ) : isOnBlockaidSheet ? (
            blockaidPane
          ) : isOnFeesPane ? (
            feesPane
          ) : isOnMemoPane ? (
            memoPane
          ) : isOnDetailsPane ? (
            detailsPane
          ) : (
            reviewPane
          )}
          {!isOnFeesPane &&
            !isOnMemoPane &&
            !isOnDetailsPane &&
            !isOnTrustlinePane && (
              <div className="ReviewTx__Actions">
                <ActionButtons
                  isOnBlockaidPane={isOnBlockaidSheet}
                  isMalicious={isMalicious}
                  isRequiredMemoMissing={isRequiredMemoMissing}
                  isValidatingMemo={isValidatingMemo}
                  onAddMemo={onAddMemo}
                  shouldShowTxWarning={shouldShowTxWarning}
                  onCancel={onCancel}
                  onConfirmTx={onConfirmTx}
                  isSubmitDisabled={isSubmitDisabled}
                  dstAsset={dstAsset}
                  dest={dest}
                  asset={asset}
                  truncatedDest={truncatedDest}
                />
              </div>
            )}
        </div>
      )}
    </View.Content>
  );
};
