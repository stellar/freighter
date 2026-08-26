import BigNumber from "bignumber.js";

import { AccountPositions, BlendSupplyRow } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";

import { getCatalogAssetIdentity } from "./earnAssetIcons";
import { headlineApy } from "./formatPoolStats";

/** One row on the Positions tab. */
export interface PositionTokenRow {
  poolId: string;
  poolName: string | null;
  protocol: string;
  assetId: string;
  code: string;
  issuer?: string;
  decimals: number;
  /** Display units, already scaled by `decimals`. */
  suppliedTokens: string;
  suppliedUsd: number | null;
  /** Headline rate as a decimal fraction; null when genuinely unknown. */
  apy: number | null;
  interestEarnedUsd: number | null;
}

const toRow = ({
  row,
  poolId,
  poolName,
  protocol,
  networkDetails,
}: {
  row: BlendSupplyRow;
  poolId: string;
  poolName: string | null;
  protocol: string;
  networkDetails: NetworkDetails;
}): PositionTokenRow => {
  // The payload reports native XLM with a null symbol AND a null name, leaving
  // its SAC as the only clue. Deriving the identity rather than reading `symbol`
  // is what keeps an XLM position from rendering a contract address.
  const { code, issuer } = getCatalogAssetIdentity({
    symbol: row.symbol,
    name: row.name,
    assetId: row.assetId,
    networkDetails,
  });
  const decimals = row.decimals ?? CLASSIC_ASSET_DECIMALS;

  return {
    poolId,
    poolName,
    protocol,
    assetId: row.assetId,
    code: code || `${row.assetId.slice(0, 4)}…`,
    issuer,
    decimals,
    suppliedTokens: new BigNumber(row.totalTokens)
      .dividedBy(new BigNumber(10).pow(decimals))
      .toFixed(),
    suppliedUsd: row.usdValue,
    // headlineApy: the null-is-not-zero exception -- see formatPoolStats.ts.
    apy: headlineApy(row.apy, row.emissionsApr),
    interestEarnedUsd: row.interestEarnedUsd,
  };
};

/**
 * Flattens the pool-shaped payload into the token-shaped rows the v1 design
 * draws — one row per supplied asset, each carrying the pool it belongs to.
 *
 * This is the ONLY place that flattening happens. The multi-pool design
 * (Figma 9848-110100) lists pools rather than tokens; switching to it is a
 * change here plus a row component, with no data-layer change at all.
 */
export const toPositionTokenRows = ({
  positions,
  networkDetails,
}: {
  positions: AccountPositions | null;
  networkDetails: NetworkDetails;
}): PositionTokenRow[] =>
  (positions?.positions || []).flatMap((position) =>
    (position.blend?.supply || []).map((row) =>
      toRow({
        row,
        poolId: position.id,
        poolName: position.name,
        protocol: position.protocol,
        networkDetails,
      }),
    ),
  );
