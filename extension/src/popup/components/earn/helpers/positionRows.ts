import BigNumber from "bignumber.js";

import { BlendSupplyRow, PoolPosition } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { isNativeContract } from "@shared/helpers/assetIdentity";
import {
  CLASSIC_ASSET_DECIMALS,
  formatTokenAmount,
  isSacContract,
} from "popup/helpers/soroban";

import { getCatalogAssetIdentity } from "./earnAssetIcons";

/** One supplied token on a pool's position screen. */
export interface PositionTokenRow {
  poolId: string;
  poolName: string | null;
  protocol: string;
  assetId: string;
  code: string;
  issuer?: string;
  /** Null when the token's scale is unknown (see `getSupplyRowDecimals`). */
  decimals: number | null;
  /** Display units, already scaled by `decimals`; null when that is unknown. */
  suppliedTokens: string | null;
  suppliedUsd: number | null;
  /** Supply interest rate, without emissions; null when genuinely unknown. */
  apy: number | null;
  interestEarnedUsd: number | null;
}

/**
 * A supply row's decimals: the payload's, else 7 for a token a classic asset
 * backs (its SAC) or native XLM, whose contracts always use 7. A Soroban-only
 * token (SEP-41) can use any scale, so without the payload's it is unknown:
 * scaling it by 7 would misstate every amount by orders of magnitude.
 */
export const getSupplyRowDecimals = (
  row: Pick<BlendSupplyRow, "assetId" | "name" | "decimals">,
  networkDetails: NetworkDetails,
): number | null => {
  if (row.decimals !== null && row.decimals !== undefined) {
    return row.decimals;
  }
  const { networkPassphrase } = networkDetails;
  return isSacContract(row.name || "", row.assetId, networkPassphrase) ||
    isNativeContract(row.assetId, networkPassphrase)
    ? CLASSIC_ASSET_DECIMALS
    : null;
};

/**
 * A supply row's token: its code, issuer and decimals. Every Positions figure
 * names its token through this, so the rules live once:
 * - native XLM arrives with a null symbol AND a null name, leaving its SAC as
 *   the only clue, so the identity is derived rather than read off `symbol`
 *   (which would render a contract address as the code);
 * - a token the catalog can't name reads as its contract's first characters;
 * - decimals come from `getSupplyRowDecimals`, and may be unknown.
 */
export const getSupplyRowIdentity = (
  row: BlendSupplyRow,
  networkDetails: NetworkDetails,
) => {
  const { code, issuer } = getCatalogAssetIdentity({
    symbol: row.symbol,
    name: row.name,
    assetId: row.assetId,
    networkDetails,
  });
  return {
    code: code || `${row.assetId.slice(0, 4)}…`,
    issuer,
    decimals: getSupplyRowDecimals(row, networkDetails),
  };
};

/**
 * An integer amount in the token's smallest unit, in display units: the app's
 * `formatTokenAmount`, which the deposit screen also uses. Null when either
 * the amount or the token's decimals are unknown.
 */
export const toDisplayTokens = (
  raw: string | null,
  decimals: number | null,
): string | null =>
  raw === null || decimals === null
    ? null
    : formatTokenAmount(new BigNumber(raw), decimals);

/** The supplied tokens of one pool, one row each, carrying the pool they're in. */
export const toPositionTokenRows = ({
  position,
  networkDetails,
}: {
  position: PoolPosition;
  networkDetails: NetworkDetails;
}): PositionTokenRow[] =>
  (position.blend?.supply || []).map((row) => {
    const { code, issuer, decimals } = getSupplyRowIdentity(
      row,
      networkDetails,
    );

    return {
      poolId: position.id,
      poolName: position.name,
      protocol: position.protocol,
      assetId: row.assetId,
      code,
      issuer,
      decimals,
      suppliedTokens: toDisplayTokens(row.totalTokens, decimals),
      suppliedUsd: row.usdValue,
      // Interest only: BLND emissions are left out, as everywhere in Earn.
      apy: row.apy,
      interestEarnedUsd: row.interestEarnedUsd,
    };
  });
