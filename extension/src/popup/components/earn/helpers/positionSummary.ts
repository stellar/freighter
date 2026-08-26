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
  const principalRaw = new BigNumber(row.totalTokens)
    .minus(row.interestEarned)
    .toFixed(0);

  return {
    assetId: row.assetId,
    code,
    issuer,
    decimals,
    tokens: scale(principalRaw, decimals),
    usd:
      row.usdValue === null
        ? null
        : row.usdValue - (row.interestEarnedUsd ?? 0),
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
  const supply = position.blend?.supply || [];
  const rows =
    scope === "pool"
      ? supply
      : // Falls back to the first supplied row: the sheet can be opened from a
        // pool card that names no asset, and an empty panel would be worse than
        // the position the account most likely means.
        [
          supply.find((row) => row.assetId === focusedAssetId) || supply[0],
        ].filter(Boolean);

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
