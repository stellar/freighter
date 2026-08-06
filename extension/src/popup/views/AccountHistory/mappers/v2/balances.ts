/**
 * Maps v2 BALANCE state changes into display rows and classifies the
 * transaction's overall balance movement (sent / received / swapped /
 * multiple).
 */

import BigNumber from "bignumber.js";

import {
  V2AccountTransaction,
  V2BalanceChange,
} from "@shared/api/types/backend-api";
import { formatTokenAmount } from "popup/helpers/soroban";
import {
  getResolvedToken,
  TokenContext,
} from "popup/helpers/history/tokenResolver";
import { BalanceChangeRow } from "popup/views/AccountHistory/model";

export type BalanceClassification =
  | { type: "none" }
  | { type: "sent"; row: BalanceChangeRow }
  | { type: "received"; row: BalanceChangeRow }
  | {
      type: "swapped";
      credit: BalanceChangeRow;
      debit: BalanceChangeRow;
      /**
       * "1 <debit.code> ≈ <rate> <credit.code>"; null when either side's scale
       * is unknown, since the ratio of unscaled amounts is meaningless
       */
      rate: string | null;
    }
  | { type: "multiple"; rows: BalanceChangeRow[] };

const isCredit = (change: V2BalanceChange) =>
  change.reason === "CREDIT" || change.reason === "MINT";

/**
 * The v2 payload carries no operation linkage on state changes, so the
 * transaction-level fee entry is structurally indistinguishable from a real
 * balance movement. Heuristic: drop the first native-token DEBIT whose raw
 * amount equals fee_charged. Remove this once the wire carries an operation id
 * or an explicit fee marker.
 */
const withoutFeeEntry = (
  changes: V2BalanceChange[],
  feeCharged: string,
  nativeTokenId: string | null,
): V2BalanceChange[] => {
  const feeIndex = changes.findIndex(
    (change) =>
      change.reason === "DEBIT" &&
      change.amount === feeCharged &&
      (nativeTokenId === null || change.token_id === nativeTokenId),
  );
  if (feeIndex === -1) {
    return changes;
  }
  return changes.filter((_, i) => i !== feeIndex);
};

export const mapBalanceChanges = (
  tx: V2AccountTransaction,
  tokens: TokenContext,
  nativeTokenId: string | null,
): { rows: BalanceChangeRow[]; classification: BalanceClassification } => {
  const balanceChanges = tx.state_changes.filter(
    (change): change is V2BalanceChange => change.variant === "BalanceChange",
  );

  const displayChanges = withoutFeeEntry(
    balanceChanges,
    tx.fee_charged,
    nativeTokenId,
  );

  const rows: BalanceChangeRow[] = displayChanges.map((change) => {
    const token = getResolvedToken(tokens, change.token_id);
    return {
      token,
      // an unknown scale can't be applied to a smallest-unit integer, and
      // guessing one renders a wildly wrong number — report no amount instead
      amount:
        token.decimals === null
          ? null
          : formatTokenAmount(new BigNumber(change.amount), token.decimals),
      direction: isCredit(change) ? "credit" : "debit",
    };
  });

  return { rows, classification: classify(rows) };
};

const classify = (rows: BalanceChangeRow[]): BalanceClassification => {
  if (rows.length === 0) {
    return { type: "none" };
  }

  const credits = rows.filter((row) => row.direction === "credit");
  const debits = rows.filter((row) => row.direction === "debit");

  if (rows.length === 1) {
    return debits.length === 1
      ? { type: "sent", row: debits[0] }
      : { type: "received", row: credits[0] };
  }

  if (
    credits.length === 1 &&
    debits.length === 1 &&
    credits[0].token.contractId !== debits[0].token.contractId
  ) {
    const credit = credits[0];
    const debit = debits[0];
    const isRateComputable =
      credit.amount !== null &&
      debit.amount !== null &&
      !new BigNumber(debit.amount).isZero();
    const rate = isRateComputable
      ? new BigNumber(credit.amount!)
          .dividedBy(debit.amount!)
          .precision(4)
          .toString()
      : null;
    return {
      type: "swapped",
      credit,
      debit,
      rate: rate
        ? `1 ${debit.token.code} ≈ ${rate} ${credit.token.code}`
        : null,
    };
  }

  return { type: "multiple", rows };
};
