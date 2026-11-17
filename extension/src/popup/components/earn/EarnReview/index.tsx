import React, { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Transaction, TransactionBuilder } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { RequestState, State } from "constants/request";
import { SimulateTxData } from "types/transactions";
import { SecurityLevel } from "popup/constants/blockaid";
import { BlockaidBanner } from "popup/components/BlockaidBanner";
import { BlockAidScanExpanded } from "popup/components/WarningMessages";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { EarnTransactionDetails } from "popup/components/earn/EarnTransactionDetails";
import { AssetIcon } from "popup/components/account/AccountAssets";
import {
  getTransactionSecurityLevel,
  useBlockaidOverrideState,
  useShouldTreatTxAsUnableToScan,
} from "popup/helpers/blockaid";
import { NO_FIAT_VALUE, formatAmount } from "popup/helpers/formatters";
import { formatRate } from "popup/components/earn/helpers/formatPoolStats";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
import { SheetHeader, SheetHeaderLayout } from "popup/components/SheetHeader";
import { StatRow } from "popup/components/earn/StatRow";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

import { formatProjection, projectEarnings } from "./helpers/projectEarnings";

import "./styles.scss";

interface EarnReviewProps {
  pool: BlendCatalogPool | null;
  assetCode: string;
  assetIssuer?: string;
  assetIcon?: string | null;
  /** Deposit amount in token units, unformatted ("1234.56"). */
  amount: string;
  /**
   * USD value of the deposit, unformatted ("1234.56"): it is added to the
   * position's value and formatted here. Null when the asset has no fresh
   * price.
   */
  amountUsd: string | null;
  apy: number | null;
  /** Existing position in display units, "0" when there is none. */
  currentPosition: string;
  /** USD value of the existing position; null when the asset has no price. */
  currentPositionUsd: string | null;
  simulationState: State<SimulateTxData, string>;
  /**
   * False after a settings save whose rebuild failed: the staged transaction
   * was built with the old settings, so there is nothing to sign.
   */
  isBuildCurrent: boolean;
  networkDetails: NetworkDetails;
  onCancel: () => void;
  onConfirm: () => void;
  /** Opens the fee/timeout settings sheet, which rebuilds the deposit. */
  onEditSettings: () => void;
}

/**
 * The gate before signing: what is being deposited, where, what it becomes, and
 * what it is projected to earn.
 *
 * Builds its own transaction-details and fees panes from the shared
 * Summary/Details/AuthEntries/FeesPane pieces rather than adding an Earn mode
 * to ReviewTx, which hardcodes its CTA copy and a fixed two-row summary.
 */
export const EarnReview = ({
  pool,
  assetCode,
  assetIssuer,
  assetIcon,
  amount,
  amountUsd,
  apy,
  currentPosition,
  currentPositionUsd,
  simulationState,
  isBuildCurrent,
  networkDetails,
  onCancel,
  onConfirm,
  onEditSettings,
}: EarnReviewProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isOnDetailsPane, setIsOnDetailsPane] = useState(false);
  const [isOnBlockaidSheet, setIsOnBlockaidSheet] = useState(false);
  // True from this review's Confirm until the device overlay closes. The
  // overlay's status is global, and this sheet stays mounted behind the token
  // picker, where the Earn swap's own review can start a signature: without
  // this, both overlays would ask the device to sign, and this one would then
  // advance the deposit with the swap's signed envelope.
  const [isSigningOnDevice, setIsSigningOnDevice] = useState(false);

  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  useEffect(() => {
    if (hwStatus !== ShowOverlayStatus.IN_PROGRESS) {
      setIsSigningOnDevice(false);
    }
  }, [hwStatus]);

  const preparedXdr = simulationState.data?.transactionXdr;
  // Nothing to sign unless the latest build succeeded. A settings save whose
  // rebuild failed brings Review back with the old transaction still staged,
  // and Confirm must not sign it.
  const canConfirm =
    isBuildCurrent &&
    simulationState.state === RequestState.SUCCESS &&
    !!preparedXdr;

  /*
   * The Blockaid verdict on the deposit the user is about to sign. Only the
   * transaction scan applies here — Earn's reserves come from the backend's
   * allowlist and there is no counterparty token to scan — so this reads
   * getTransactionSecurityLevel directly instead of merging several verdicts
   * the way the swap review does.
   *
   * shouldTreatTxAsUnableToScan carries the network gate, so off-mainnet (where
   * the scan is a no-op and comes back null) never warns.
   */
  const txScanResult = simulationState.data?.scanResult;
  const shouldTreatTxAsUnableToScan = useShouldTreatTxAsUnableToScan();
  const blockaidOverrideState = useBlockaidOverrideState();
  const securityLevel = getTransactionSecurityLevel(
    txScanResult,
    shouldTreatTxAsUnableToScan(txScanResult),
    blockaidOverrideState,
  );
  const isMalicious = securityLevel === SecurityLevel.MALICIOUS;
  const isSuspicious = securityLevel === SecurityLevel.SUSPICIOUS;
  /*
   * Two independent gates, because unable-to-scan is weaker than a verdict.
   *
   * The banner shows for all three states — the user should know the scan came
   * back empty. The action row only recolors for an actual finding, so a scan
   * Blockaid simply couldn't complete never tints the buttons. This is a
   * deliberate split from ReviewTx, which folds unable-to-scan into one flag
   * and lets it demote Confirm.
   */
  const shouldShowTxWarning =
    isMalicious ||
    isSuspicious ||
    securityLevel === SecurityLevel.UNABLE_TO_SCAN;

  /*
   * Same shape as ReviewTx's onConfirmTx: a hardware wallet signs here, on the
   * review, and only advances the flow once the device has answered. Confirm
   * must not step to the deposit terminal first — that screen submits on mount,
   * and with nothing signed it would post an unsigned envelope.
   *
   * Branching on the wallet alone, not on having an XDR: with no envelope to
   * sign the overlay stalls on "Connect device", which is a visible dead end,
   * where falling through would post an empty envelope instead.
   */
  const onConfirmTx = () => {
    if (!canConfirm) {
      return;
    }
    if (isHardwareWallet) {
      setIsSigningOnDevice(true);
      dispatch(
        startHwSign({
          transactionXDR: preparedXdr || "",
          shouldSubmit: true,
        }),
      );
      return;
    }
    onConfirm();
  };

  const detailTx = React.useMemo(() => {
    if (!preparedXdr) {
      return null;
    }
    try {
      const parsed = TransactionBuilder.fromXDR(
        preparedXdr,
        networkDetails.networkPassphrase,
      );
      // The Earn flow never builds fee-bump envelopes, but guard so the cast
      // below can't dereference a missing operations array.
      return "operations" in parsed ? (parsed as Transaction) : null;
    } catch (e) {
      return null;
    }
  }, [preparedXdr, networkDetails.networkPassphrase]);

  const positionAfter = new BigNumber(currentPosition)
    .plus(amount || "0")
    .toFixed();

  // What the whole position is projected to earn once the deposit lands, as on
  // mobile: one estimate, not a before -> after pair.
  const { monthly, yearly } = projectEarnings({
    depositUsd:
      currentPositionUsd !== null && amountUsd !== null
        ? new BigNumber(currentPositionUsd).plus(amountUsd).toFixed()
        : null,
    apy,
  });
  // An unknown projection reads "--" rather than "≈ --". The sign needs no
  // translation.
  const formatEstimate = (value: string | null) =>
    value === null ? NO_FIAT_VALUE : `≈ ${formatProjection(value)}`;

  if (isOnDetailsPane && detailTx && preparedXdr) {
    return (
      <EarnTransactionDetails
        transaction={detailTx}
        xdr={preparedXdr}
        onClose={() => setIsOnDetailsPane(false)}
        testIdPrefix="earn-review"
      />
    );
  }

  /*
   * Replaces the review body while the device is signing, the way ReviewTx does
   * inside Send's review modal. HardwareSign writes the signed envelope back
   * over transactionSimulation.preparedTransaction and then calls onSubmit, so
   * the deposit terminal it advances to reads the signed XDR from redux.
   *
   * Only for a signature this review asked for (see isSigningOnDevice).
   */
  if (
    isSigningOnDevice &&
    hwStatus === ShowOverlayStatus.IN_PROGRESS &&
    hardwareWalletType
  ) {
    return (
      <HardwareSign
        isInternal
        walletType={hardwareWalletType}
        onSubmit={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  /*
   * Shared by the review body and the Blockaid sheet, so acknowledging a
   * warning is possible from either. The row keeps the same three slots in
   * every state — fee settings, Cancel, Confirm — and a Blockaid verdict only
   * recolors it. Confirm stays a real button rather than dropping to a text
   * link, so the flagged layout matches the clean one.
   *
   * `warningTone` tracks BlockaidBanner's severity colors (red for malicious,
   * amber for suspicious) so a tinted row always matches the banner above it.
   * It is null for unable-to-scan, which shows the banner alone.
   *
   * Built here rather than reusing ReviewTx's ActionButtons, which hardcodes
   * the Send/Swap CTA copy and takes memo props this flow has none of.
   */
  const warningTone = isMalicious
    ? "malicious"
    : isSuspicious
      ? "caution"
      : null;

  const actions = (
    <div className="EarnReview__actions">
      <button
        type="button"
        className="EarnReview__settings"
        aria-label={t("Settings")}
        data-testid="earn-review-settings-btn"
        onClick={onEditSettings}
      >
        <Icon.Settings04 />
      </button>
      {/* Cancel is the recommended action once a warning is up, so it takes on
          the filled weight in the severity color. The tone lives on the
          wrapper, not on Button: SDS spreads incoming props after its own
          className, so passing one through would wipe the base Button classes.
          Its colors are custom properties, so overriding them on an ancestor
          carries hover, focus and disabled along for free. */}
      <div
        className={`EarnReview__action${
          warningTone ? ` EarnReview__action--cancel-${warningTone}` : ""
        }`}
      >
        <Button
          size="lg"
          variant={warningTone === "malicious" ? "destructive" : "tertiary"}
          isRounded
          isFullWidth
          onClick={onCancel}
          data-testid="earn-review-cancel"
        >
          {t("Cancel")}
        </Button>
      </div>
      {/* Confirm stays reachable but is demoted to an outline in the severity
          color, which is what the old "Confirm anyway" text link conveyed. */}
      <div
        className={`EarnReview__action${
          warningTone ? ` EarnReview__action--confirm-${warningTone}` : ""
        }`}
      >
        <Button
          size="lg"
          variant="secondary"
          isRounded
          isFullWidth
          disabled={!canConfirm}
          onClick={onConfirmTx}
          data-testid="earn-review-confirm"
        >
          {t("Confirm")}
        </Button>
      </div>
    </div>
  );

  /*
   * The "Do not proceed" detail sheet, listing Blockaid's reasons. Rendered
   * after the hardware check above so that confirming from this sheet with a
   * device connected swaps in HardwareSign instead of leaving the sheet up.
   *
   * Its actions mirror mobile's security detail sheet. Cancel returns to the
   * review. On a malicious or suspicious verdict "Confirm anyway" signs from
   * here, as the review's own Confirm would. When the scan could not run, there
   * is no verdict to acknowledge, so "Continue" only returns to the review,
   * whose Confirm stays the one way to sign.
   */
  if (isOnBlockaidSheet) {
    const isUnableToScan = securityLevel === SecurityLevel.UNABLE_TO_SCAN;
    const backToReview = () => setIsOnBlockaidSheet(false);

    return (
      <div className="EarnReview" data-testid="earn-review-blockaid-pane">
        <BlockAidScanExpanded
          scanResult={txScanResult}
          onClose={backToReview}
        />
        <div className="EarnReview__blockaid-actions">
          <Button
            size="lg"
            variant={isMalicious ? "destructive" : "secondary"}
            isRounded
            isFullWidth
            onClick={backToReview}
            data-testid="earn-review-blockaid-cancel"
          >
            {t("Cancel")}
          </Button>
          <button
            type="button"
            className={`EarnReview__text-action EarnReview__text-action--${
              isMalicious ? "error" : "default"
            }`}
            disabled={!isUnableToScan && !canConfirm}
            onClick={isUnableToScan ? backToReview : onConfirmTx}
            data-testid="earn-review-blockaid-proceed"
          >
            {isUnableToScan ? t("Continue") : t("Confirm anyway")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="EarnReview" data-testid="earn-review">
      <SheetHeader
        layout={SheetHeaderLayout.Centered}
        title={t("Review deposit")}
      />

      <div className="EarnReview__blocks">
        <div className="EarnReview__group EarnReview__group--deposit">
          <div className="EarnReview__group-title">
            {t("You are depositing")}
          </div>
          <div className="EarnReview__flow">
            <div className="EarnReview__asset">
              <AssetIcon
                assetIcons={assetIcon ? { [assetCode]: assetIcon } : {}}
                code={assetCode}
                issuerKey={assetIssuer}
                icon={assetIcon || undefined}
              />
              <div>
                <div
                  className="EarnReview__primary"
                  data-testid="earn-review-amount"
                >
                  {formatEarnAmount(amount)} {assetCode}
                </div>
                <div className="EarnReview__secondary">
                  {amountUsd === null
                    ? NO_FIAT_VALUE
                    : `$${formatAmount(amountUsd)}`}
                </div>
              </div>
            </div>

            <div className="EarnReview__arrow">
              <Icon.ArrowDown />
            </div>

            <div className="EarnReview__asset">
              <PoolIcon />
              <div>
                <div className="EarnReview__secondary">{t("To")}</div>
                <div
                  className="EarnReview__primary"
                  data-testid="earn-review-pool"
                >
                  {formatPoolName(pool?.name, t)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sits between the deposit card and the position rows rather than at
            the top of the view, so the warning reads against the deposit it is
            about — the same placement the swap review uses. */}
        {securityLevel && shouldShowTxWarning ? (
          <BlockaidBanner
            securityLevel={securityLevel}
            entity="transaction"
            onClick={() => setIsOnBlockaidSheet(true)}
            dataTestId="earn-review-blockaid-warning"
          />
        ) : null}

        <div className="EarnReview__group EarnReview__group--rows">
          <StatRow
            label={t("Position")}
            testId="earn-review-position"
            value={
              <>
                <span className="EarnReview__before">
                  {`${formatEarnAmount(currentPosition)} → `}
                </span>
                {formatEarnAmount(positionAfter)} {assetCode}
              </>
            }
          />
          <StatRow
            label={t("Current APY")}
            value={formatRate(apy)}
            isPositive
            testId="earn-review-apy"
          />
          <StatRow
            label={t("Monthly earnings (est.)")}
            testId="earn-review-monthly"
            value={formatEstimate(monthly)}
          />
          <StatRow
            label={t("Yearly earnings (est.)")}
            testId="earn-review-yearly"
            value={formatEstimate(yearly)}
          />
        </div>

        {detailTx && (
          <button
            type="button"
            className="EarnReview__details-btn"
            data-testid="earn-review-details-btn"
            onClick={() => setIsOnDetailsPane(true)}
          >
            <Icon.List />
            <span>{t("Transaction details")}</span>
          </button>
        )}
      </div>

      {actions}
    </div>
  );
};
