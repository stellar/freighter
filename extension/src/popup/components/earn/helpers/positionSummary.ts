import BigNumber from "bignumber.js";

import { BlendSupplyRow, PoolPosition } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { projectEarnings } from "popup/components/earn/EarnReview/helpers/projectEarnings";

import { getSupplyRowIdentity, toDisplayTokens } from "./positionRows";

export interface PositionAssetRow {
  assetId: string;
  code: string;
  issuer?: string;
  decimals: number | null;
  /** Display units, already scaled; null when the token's scale is unknown. */
  tokens: string | null;
  usd: number | null;
}

export interface PositionSummary {
  currentBalanceUsd: number | null;
  /** Supply interest rate, without BLND emissions. */
  apy: number | null;
  deposits: PositionAssetRow[];
  earnings: PositionAssetRow[];
  /** Formatted to 2dp, or null when the rate or the balance is unavailable. */
  estMonthlyUsd: string | null;
  estYearlyUsd: string | null;
}

/**
 * Deposits mean PRINCIPAL, not the current total.
 *
 * `total_tokens` already carries accrued interest, and the earnings card reports
 * that same interest — counting it in both would show the user their $0.12
 * twice and break the frame's own arithmetic, where Current Balance equals
 * deposits plus earnings. The payload has no principal field, so it is derived.
 * See design doc Q2; this is the one line to change if the team decides
 * otherwise.
 */
const toDepositRow = (
  row: BlendSupplyRow,
  networkDetails: NetworkDetails,
): PositionAssetRow => {
  const { code, issuer, decimals } = getSupplyRowIdentity(row, networkDetails);
  const totalTokens = new BigNumber(row.totalTokens);
  const interestEarned = new BigNumber(row.interestEarned);

  const usdOutOfRange =
    row.usdValue !== null &&
    row.interestEarnedUsd !== null &&
    row.interestEarnedUsd > row.usdValue;

  // `interestEarned` is lifetime; `totalTokens` is the current balance (see
  // the comment above). A fully-exited position, or any over-withdrawal,
  // makes this subtraction negative -- a real payload state, not a bug: the
  // principal assumption this row depends on simply does not hold for it, so
  // report "no principal reading" (0 tokens, null usd) rather than a
  // negative balance no other figure on the card would agree with.
  const isOutOfRange =
    interestEarned.isGreaterThan(totalTokens) || usdOutOfRange;

  return {
    assetId: row.assetId,
    code,
    issuer,
    decimals,
    tokens: isOutOfRange
      ? "0"
      : toDisplayTokens(totalTokens.minus(interestEarned).toFixed(0), decimals),
    usd:
      isOutOfRange || row.usdValue === null || row.interestEarnedUsd === null
        ? null
        : new BigNumber(row.usdValue).minus(row.interestEarnedUsd).toNumber(),
  };
};

const toEarningsRow = (
  row: BlendSupplyRow,
  networkDetails: NetworkDetails,
): PositionAssetRow => {
  const { code, issuer, decimals } = getSupplyRowIdentity(row, networkDetails);

  return {
    assetId: row.assetId,
    code,
    issuer,
    decimals,
    tokens: toDisplayTokens(row.interestEarned, decimals),
    usd: row.interestEarnedUsd,
  };
};

/** The focused token's supply row, or none when the pool holds none of it. */
const resolveRows = ({
  position,
  focusedAssetId,
}: {
  position: PoolPosition;
  focusedAssetId: string;
}): BlendSupplyRow[] => {
  const match = (position.blend?.supply || []).find(
    (row) => row.assetId === focusedAssetId,
  );
  return match ? [match] : [];
};

/**
 * A token position screen's "Your position" figures, for one supplied token.
 *
 * Pool-level totals are a different surface with a different helper — see
 * `getPoolPositionSummary`. This one never aggregates.
 */
export const getPositionSummary = ({
  position,
  focusedAssetId,
  networkDetails,
}: {
  position: PoolPosition;
  focusedAssetId: string;
  networkDetails: NetworkDetails;
}): PositionSummary => {
  const rows = resolveRows({ position, focusedAssetId });

  const currentBalanceUsd = rows[0]?.usdValue ?? null;
  // Interest only: BLND emissions are left out, as everywhere in Earn.
  const apy = rows[0]?.apy ?? null;

  const deposits = rows.map((row) => toDepositRow(row, networkDetails));
  const earnings = rows.map((row) => toEarningsRow(row, networkDetails));

  // Projected on the whole balance, not the principal the deposits card shows:
  // Blend accrues interest into the supplied balance itself, so interest
  // already earned earns too. Projecting on principal would understate the
  // estimate by exactly the gain shown above it.
  const { monthly, yearly } = projectEarnings({
    depositUsd:
      currentBalanceUsd === null
        ? null
        : new BigNumber(currentBalanceUsd).toFixed(),
    apy,
  });

  return {
    currentBalanceUsd,
    apy,
    deposits,
    earnings,
    estMonthlyUsd: monthly,
    estYearlyUsd: yearly,
  };
};
