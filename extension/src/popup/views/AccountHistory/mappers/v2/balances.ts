/**
 * Maps v2 BALANCE state changes into display rows and classifies the
 * transaction's overall balance movement (sent / received / swapped /
 * multiple).
 */

import BigNumber from "bignumber.js";

import {
  V2AccountTransaction,
  V2StandardBalanceChange,
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
      /** "1 <debit.code> ≈ <rate> <credit.code>" */
      rate: string;
    }
  | { type: "multiple"; rows: BalanceChangeRow[] };

const isCredit = (change: V2StandardBalanceChange) =>
  change.reason === "CREDIT" || change.reason === "MINT";

/**
 * The v2 payload carries no operation linkage on state changes, so the
 * transaction-level fee entry is indistinguishable structurally. Heuristic:
 * drop the first native-token DEBIT whose raw amount equals fee_charged.
 * (Backend follow-up filed to add operation_id / a fee marker.)
 */
const withoutFeeEntry = (
  changes: V2StandardBalanceChange[],
  feeCharged: string,
  nativeTokenId: string | null,
): V2StandardBalanceChange[] => {
  const feeIndex = changes.findIndex(
    (change) =>
      change.reason === "DEBIT" &&
      change.amount === feeCharged &&
      (nativeTokenId === null ||
        change.standard_balance_token_id === nativeTokenId),
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
    (change): change is V2StandardBalanceChange => change.type === "BALANCE",
  );

  const displayChanges = withoutFeeEntry(
    balanceChanges,
    tx.fee_charged,
    nativeTokenId,
  );

  const rows: BalanceChangeRow[] = displayChanges.map((change) => {
    const token = getResolvedToken(tokens, change.standard_balance_token_id);
    return {
      token,
      amount: formatTokenAmount(new BigNumber(change.amount), token.decimals),
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
    const rate = new BigNumber(credit.amount)
      .dividedBy(debit.amount)
      .precision(4)
      .toString();
    return {
      type: "swapped",
      credit,
      debit,
      rate: `1 ${debit.token.code} ≈ ${rate} ${credit.token.code}`,
    };
  }

  return { type: "multiple", rows };
};
