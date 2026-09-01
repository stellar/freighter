import React, { useState } from "react";
import BigNumber from "bignumber.js";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  Operation,
  OperationRecord,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { OPERATION_TYPES } from "constants/transaction";
import { State } from "constants/request";
import { SimulateTxData } from "types/transactions";
import { SecurityLevel } from "popup/constants/blockaid";
import { AuthEntries } from "popup/components/AuthEntry";
import { BlockaidBanner } from "popup/components/BlockaidBanner";
import { BlockAidScanExpanded } from "popup/components/WarningMessages";
import { FeesPane } from "popup/components/InternalTransaction/FeesPane";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { Summary } from "popup/views/SignTransaction/Preview/Summary";
import { Details } from "popup/views/SignTransaction/Preview/Details";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { AssetIcon } from "popup/components/account/AccountAssets";
import {
  getTransactionSecurityLevel,
  useBlockaidOverrideState,
  useShouldTreatTxAsUnableToScan,
} from "popup/helpers/blockaid";
import { getAuthEntryBoundAddress } from "popup/helpers/soroban";
import { NO_FIAT_VALUE, formatAmount } from "popup/helpers/formatters";
import { formatRate } from "popup/components/earn/helpers/formatPoolStats";
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
  /** Human-readable deposit amount. */
  amount: string;
  /** USD value of the deposit; null when the asset has no fresh price. */
  amountUsd: string | null;
  apy: number | null;
  /** Existing position in display units, "0" when there is none. */
  currentPosition: string;
  /** USD value of the existing position; null when the asset has no price. */
  currentPositionUsd: string | null;
  fee: string;
  simulationState: State<SimulateTxData, string>;
  networkDetails: NetworkDetails;
  onCancel: () => void;
  onConfirm: () => void;
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
  fee,
  simulationState,
  networkDetails,
  onCancel,
  onConfirm,
}: EarnReviewProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isOnDetailsPane, setIsOnDetailsPane] = useState(false);
  const [isOnFeesPane, setIsOnFeesPane] = useState(false);
  const [isOnBlockaidSheet, setIsOnBlockaidSheet] = useState(false);

  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  const preparedXdr = simulationState.data?.transactionXdr;

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
    if (isHardwareWallet) {
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

  const authEntries =
    detailTx &&
    (detailTx.operations[0] as Operation.InvokeHostFunction).auth?.length
      ? (detailTx.operations[0] as Operation.InvokeHostFunction).auth!.map(
          (authEntry) => ({
            invocation: authEntry.rootInvocation(),
            boundAddress: getAuthEntryBoundAddress(authEntry),
          }),
        )
      : [];

  const positionAfter = formatAmount(
    new BigNumber(currentPosition).plus(amount || "0").toFixed(),
  );

  // Projections are shown as before -> after, so both sides are computed:
  // "before" from the existing position, "after" from position plus deposit.
  const currentEarnings = projectEarnings({
    depositUsd: currentPositionUsd,
    apy,
  });
  const { monthly, yearly } = projectEarnings({
    depositUsd:
      currentPositionUsd !== null && amountUsd !== null
        ? new BigNumber(currentPositionUsd).plus(amountUsd).toFixed()
        : null,
    apy,
  });

  if (isOnFeesPane) {
    return (
      <div className="EarnReview">
        <FeesPane
          fee={fee}
          simulationState={simulationState}
          isSoroban
          onClose={() => setIsOnFeesPane(false)}
        />
      </div>
    );
  }

  if (isOnDetailsPane && detailTx) {
    return (
      <div
        className="EarnReview EarnReview--details"
        data-testid="earn-review-details-pane"
      >
        <div className="EarnReview__details-header">
          <Text as="div" size="md" weight="semi-bold">
            {t("Transaction details")}
          </Text>
          <button
            type="button"
            className="EarnReview__close"
            aria-label={t("Close")}
            onClick={() => setIsOnDetailsPane(false)}
          >
            <Icon.XClose />
          </button>
        </div>
        <div
          className="EarnReview__details-body"
          data-testid="earn-review-details-body"
        >
          <Summary
            sequenceNumber={detailTx.sequence}
            fee={detailTx.fee}
            memo={undefined}
            xdr={preparedXdr!}
            operationNames={detailTx.operations.map(
              (op) =>
                OPERATION_TYPES[op.type as keyof typeof OPERATION_TYPES] ||
                op.type,
            )}
          />
          {authEntries.length > 0 && <AuthEntries entries={authEntries} />}
          <Details
            operations={detailTx.operations as unknown as OperationRecord[]}
            flaggedKeys={{}}
            isMemoRequired={false}
            scanAssets={false}
          />
        </div>
      </div>
    );
  }

  /*
   * Replaces the review body while the device is signing, the way ReviewTx does
   * inside Send's review modal. HardwareSign writes the signed envelope back
   * over transactionSimulation.preparedTransaction and then calls onSubmit, so
   * the deposit terminal it advances to reads the signed XDR from redux.
   */
  if (hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType) {
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
        aria-label={t("Fee settings")}
        data-testid="earn-review-fees-btn"
        onClick={() => setIsOnFeesPane(true)}
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
          size="md"
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
          size="md"
          variant="secondary"
          isRounded
          isFullWidth
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
   */
  if (isOnBlockaidSheet) {
    return (
      <div className="EarnReview" data-testid="earn-review-blockaid-pane">
        <BlockAidScanExpanded
          scanResult={txScanResult}
          onClose={() => setIsOnBlockaidSheet(false)}
        />
        {actions}
      </div>
    );
  }

  return (
    <div className="EarnReview" data-testid="earn-review">
      <div className="EarnReview__group">
        <Text as="div" size="sm">
          {t("You are depositing")}
        </Text>
        <div className="EarnReview__asset">
          <AssetIcon
            assetIcons={assetIcon ? { [assetCode]: assetIcon } : {}}
            code={assetCode}
            issuerKey={assetIssuer}
            icon={assetIcon || undefined}
          />
          <div>
            <div
              className="EarnReview__amount"
              data-testid="earn-review-amount"
            >
              {formatAmount(amount)} {assetCode}
            </div>
            <Text as="div" size="sm">
              {amountUsd === null
                ? NO_FIAT_VALUE
                : `$${formatAmount(amountUsd)}`}
            </Text>
          </div>
        </div>

        <div className="EarnReview__chevrons">
          <Icon.ChevronDownDouble />
        </div>

        <div className="EarnReview__asset">
          <PoolIcon />
          <div>
            <Text as="div" size="xs">
              {t("To")}
            </Text>
            <div className="EarnReview__amount">
              {pool?.name || t("Blend pool")}
            </div>
          </div>
        </div>
      </div>

      {/* Sits between the deposit card and the position rows rather than at the
          top of the view, so the warning reads against the deposit it is about
          — the same placement the swap review uses. */}
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
                {formatAmount(currentPosition)}
              </span>
              {" → "}
              {positionAfter} {assetCode}
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
          value={
            <>
              <span className="EarnReview__before">
                {formatProjection(currentEarnings.monthly)}
              </span>
              {" → "}
              {formatProjection(monthly)}
            </>
          }
        />
        <StatRow
          label={t("Yearly earnings (est.)")}
          testId="earn-review-yearly"
          value={
            <>
              <span className="EarnReview__before">
                {formatProjection(currentEarnings.yearly)}
              </span>
              {" → "}
              {formatProjection(yearly)}
            </>
          }
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

      {actions}
    </div>
  );
};
