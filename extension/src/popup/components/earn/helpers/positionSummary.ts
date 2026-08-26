import BigNumber from "bignumber.js";

import { BlendSupplyRow, PoolPosition } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";
import { projectEarnings } from "popup/components/earn/EarnReview/helpers/projectEarnings";

import { getCatalogAssetIdentity } from "./earnAssetIcons";

export type PositionScope = "supply" | "pool";

/**
 * v1 renders one supplied asset — the row the user tapped. Flip to "pool" to
 * aggregate every supply row in the position; `deposits` and `earnings` are
 * already arrays, so nothing in the sheet has to change. See design doc Q1.
 */
export const POSITION_SUMMARY_SCOPE: PositionScope = "supply";

export interface PositionAssetRow {
  assetId: string;
  code: string;
  issuer?: string;
  decimals: number;
  /** Display units, already scaled. */
  tokens: string;
  usd: number | null;
}

export interface PositionSummary {
  currentBalanceUsd: number | null;
  /** Headline rate: apy + emissions, or the pool's netApy under pool scope. */
  apy: number | null;
  deposits: PositionAssetRow[];
  earnings: PositionAssetRow[];
  /** Formatted to 2dp, or null when the rate or the balance is unavailable. */
  estMonthlyUsd: string | null;
  estYearlyUsd: string | null;
}

const scale = (raw: string, decimals: number) =>
  new BigNumber(raw).dividedBy(new BigNumber(10).pow(decimals)).toFixed();

const identity = (row: BlendSupplyRow, networkDetails: NetworkDetails) => {
  // Native XLM arrives with a null symbol AND a null name, recognisable only by
  // its SAC — reading `symbol` alone renders a contract address as the code.
  const { code, issuer } = getCatalogAssetIdentity({
    symbol: row.symbol,
    name: row.name,
    assetId: row.assetId,
    networkDetails,
  });
  return {
    code: code || `${row.assetId.slice(0, 4)}…`,
    issuer,
    decimals: row.decimals ?? CLASSIC_ASSET_DECIMALS,
  };
};

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
  const { code, issuer, decimals } = identity(row, networkDetails);
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
      : scale(totalTokens.minus(interestEarned).toFixed(0), decimals),
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
  const { code, issuer, decimals } = identity(row, networkDetails);

  return {
    assetId: row.assetId,
    code,
    issuer,
    decimals,
    tokens: scale(row.interestEarned, decimals),
    usd: row.interestEarnedUsd,
  };
};

const headlineApy = (apy: number | null, emissionsApr: number | null) =>
  apy === null ? null : apy + (emissionsApr ?? 0);

/**
 * The rows this summary is scoped to. The ONLY place the focused-asset
 * resolution rule lives — `getPositionSummary` and `hasResolvableSupply`
 * both call this rather than each encoding their own idea of a match.
 *
 * `focusedAssetId` genuinely absent (undefined) falls back to the first
 * supplied row: the sheet can be opened from a pool card that names no
 * asset, and a guess at the position the account most likely means beats an
 * empty panel. A `focusedAssetId` that is PRESENT but matches no supplied
 * row is a mismatch, not an absence -- `EarnAmount` always names the asset
 * it is depositing, so this fires when the account has no position in that
 * asset yet. Falling back to `supply[0]` there would show a different
 * asset's figures under this asset's headers, so it resolves to an empty
 * scope instead.
 */
const resolveRows = ({
  position,
  focusedAssetId,
  scope,
}: {
  position: PoolPosition;
  focusedAssetId?: string;
  scope: PositionScope;
}): BlendSupplyRow[] => {
  const supply = position.blend?.supply || [];
  if (scope === "pool") {
    return supply;
  }
  if (focusedAssetId === undefined) {
    return [supply[0]].filter(Boolean);
  }
  const match = supply.find((row) => row.assetId === focusedAssetId);
  return match ? [match] : [];
};

/**
 * Whether `getPositionSummary` would resolve to any row at all, for this same
 * `position`/`focusedAssetId`/`scope`. `PoolDetailsSheet` uses this to decide
 * whether "Your position" has anything to show, so it never renders a tab
 * whose panel would be empty (see `resolveRows`).
 */
export const hasResolvableSupply = ({
  position,
  focusedAssetId,
  scope = POSITION_SUMMARY_SCOPE,
}: {
  position: PoolPosition;
  focusedAssetId?: string;
  scope?: PositionScope;
}): boolean => resolveRows({ position, focusedAssetId, scope }).length > 0;

/**
 * The sheet's "Your position" figures, for one supplied asset or for the whole
 * pool. The ONLY place this derivation lives — the component renders whatever
 * comes back and knows nothing about scope.
 *
 * The two Est. rows are computed once from the scoped balance and rate, never
 * once per asset: that is how the design draws them, inside the earnings card
 * below a divider.
 */
export const getPositionSummary = ({
  position,
  focusedAssetId,
  networkDetails,
  scope = POSITION_SUMMARY_SCOPE,
}: {
  position: PoolPosition;
  focusedAssetId?: string;
  networkDetails: NetworkDetails;
  scope?: PositionScope;
}): PositionSummary => {
  const rows = resolveRows({ position, focusedAssetId, scope });

  const currentBalanceUsd =
    scope === "pool" ? position.netUsd : (rows[0]?.usdValue ?? null);
  const apy =
    scope === "pool"
      ? position.netApy
      : headlineApy(rows[0]?.apy ?? null, rows[0]?.emissionsApr ?? null);

  const deposits = rows.map((row) => toDepositRow(row, networkDetails));
  const earnings = rows.map((row) => toEarningsRow(row, networkDetails));

  const depositUsd = deposits.reduce<BigNumber | null>((sum, row) => {
    if (row.usd === null || sum === null) {
      return null;
    }
    return sum.plus(row.usd);
  }, new BigNumber(0));

  const { monthly, yearly } = projectEarnings({
    depositUsd: depositUsd === null ? null : depositUsd.toFixed(),
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
