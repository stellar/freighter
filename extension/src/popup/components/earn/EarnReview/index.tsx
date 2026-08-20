import React, { useState } from "react";
import BigNumber from "bignumber.js";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
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
import { AuthEntries } from "popup/components/AuthEntry";
import { FeesPane } from "popup/components/InternalTransaction/FeesPane";
import { Summary } from "popup/views/SignTransaction/Preview/Summary";
import { Details } from "popup/views/SignTransaction/Preview/Details";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { getAuthEntryBoundAddress } from "popup/helpers/soroban";
import { formatAmount } from "popup/helpers/formatters";
import { formatRate } from "popup/components/earn/helpers/formatPoolStats";
import { StatRow } from "popup/components/earn/StatRow";

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
  const [isOnDetailsPane, setIsOnDetailsPane] = useState(false);
  const [isOnFeesPane, setIsOnFeesPane] = useState(false);

  const preparedXdr = simulationState.data?.transactionXdr;

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
              {amountUsd === null ? "--" : `$${formatAmount(amountUsd)}`}
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
        <Button
          size="md"
          variant="tertiary"
          isRounded
          isFullWidth
          onClick={onCancel}
          data-testid="earn-review-cancel"
        >
          {t("Cancel")}
        </Button>
        <Button
          size="md"
          variant="secondary"
          isRounded
          isFullWidth
          onClick={onConfirm}
          data-testid="earn-review-confirm"
        >
          {t("Confirm")}
        </Button>
      </div>
    </div>
  );
};
