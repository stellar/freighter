import { captureException } from "@sentry/browser";

import { NetworkDetails } from "@shared/constants/stellar";
import { fetchBackendV2 } from "./fetchBackendV2";
import {
  AccountPositions,
  ApiAccountPositions,
  ApiBlendBackstopRow,
  ApiBlendBorrowRow,
  ApiBlendCatalogPool,
  ApiBlendCatalogReserve,
  ApiBlendEarnAssetOption,
  ApiBlendEarnOptionsCatalog,
  ApiBlendEarnPool,
  ApiBlendPoolsCatalog,
  ApiBlendSupplyRow,
  ApiPoolPosition,
  BlendBackstopRow,
  BlendBorrowRow,
  BlendCatalogPool,
  BlendCatalogReserve,
  BlendEarnAssetOption,
  BlendEarnPool,
  BlendSupplyRow,
  PoolPosition,
} from "../types/blend";

/**
 * Clients for freighter-backend-v2's Blend endpoints.
 *
 * Every request puts its query string in `path`, never appends it downstream:
 * `authedFetch` signs the JWT's `methodAndPath` over the server's full request
 * target (pathname + search), so a query added anywhere else yields a 401.
 *
 * `networkDetails.network` is already exactly "PUBLIC" / "TESTNET" (the NETWORKS
 * enum), which is what the handler validates against. Networks outside those two
 * are rejected with a 400 — callers should gate on `isEarnSupportedNetwork`
 * rather than relying on the error.
 */

const mapEarnPool = (pool: ApiBlendEarnPool): BlendEarnPool => ({
  id: pool.id,
  name: pool.name,
  supplyApy: pool.supply_apy,
  emissionsSupplyApr: pool.emissions_supply_apr,
  suppliedUsd: pool.supplied_usd,
});

const mapEarnAssetOption = (
  option: ApiBlendEarnAssetOption,
): BlendEarnAssetOption => ({
  assetId: option.asset_id,
  symbol: option.symbol,
  name: option.name,
  decimals: option.decimals,
  pools: (option.pools || []).map(mapEarnPool),
});

const mapCatalogReserve = (
  reserve: ApiBlendCatalogReserve,
): BlendCatalogReserve => ({
  assetId: reserve.asset_id,
  symbol: reserve.symbol,
  name: reserve.name,
  decimals: reserve.decimals,
  enabled: reserve.enabled,
  utilization: reserve.utilization,
  supplyApy: reserve.supply_apy,
  borrowApy: reserve.borrow_apy,
  emissionsSupplyApr: reserve.emissions_supply_apr,
  suppliedUsd: reserve.supplied_usd,
  borrowedUsd: reserve.borrowed_usd,
  priceUsd: reserve.price_usd,
});

const mapCatalogPool = (pool: ApiBlendCatalogPool): BlendCatalogPool => ({
  id: pool.id,
  name: pool.name,
  status: pool.status,
  suppliedUsd: pool.supplied_usd,
  borrowedUsd: pool.borrowed_usd,
  interestApy: pool.interest_apy,
  netApy: pool.net_apy,
  // Normalised to null while the backend still omits the field, so callers have
  // one "unavailable" case to render rather than two.
  backstopUsd: pool.backstop_usd ?? null,
  reserves: (pool.reserves || []).map(mapCatalogReserve),
});

const mapSupplyRow = (row: ApiBlendSupplyRow): BlendSupplyRow => ({
  assetId: row.asset_id,
  symbol: row.symbol,
  name: row.name,
  decimals: row.decimals,
  suppliedTokens: row.supplied_tokens,
  collateralTokens: row.collateral_tokens,
  totalTokens: row.total_tokens,
  usdValue: row.usd_value,
  apy: row.apy,
  emissionsApr: row.emissions_apr,
  interestEarned: row.interest_earned,
  interestEarnedUsd: row.interest_earned_usd,
  claimableBlnd: row.claimable_blnd,
  claimableUsd: row.claimable_usd,
  priceUsd: row.price_usd,
});

const mapBorrowRow = (row: ApiBlendBorrowRow): BlendBorrowRow => ({
  assetId: row.asset_id,
  symbol: row.symbol,
  name: row.name,
  decimals: row.decimals,
  borrowedTokens: row.borrowed_tokens,
  usdValue: row.usd_value,
  apy: row.apy,
  emissionsApr: row.emissions_apr,
  priceUsd: row.price_usd,
});

const mapBackstopRow = (row: ApiBlendBackstopRow): BlendBackstopRow => ({
  poolId: row.pool_id,
  poolName: row.pool_name,
  shares: row.shares,
  lpTokens: row.lp_tokens,
  usdValue: row.usd_value,
  claimableBlnd: row.claimable_blnd,
  claimableUsd: row.claimable_usd,
  q4w: (row.q4w || []).map((entry) => ({
    amount: entry.amount,
    lpTokens: entry.lp_tokens,
    usdValue: entry.usd_value,
    expiration: entry.expiration,
  })),
});

const mapPoolPosition = (position: ApiPoolPosition): PoolPosition => ({
  protocol: position.protocol,
  id: position.id,
  name: position.name ?? null,
  netUsd: position.net_usd ?? null,
  suppliedUsd: position.supplied_usd ?? null,
  borrowedUsd: position.borrowed_usd ?? null,
  netApy: position.net_apy ?? null,
  // Left undefined rather than defaulted to empty arrays: absent detail and
  // "detail present but holding nothing" are different states, and the sheet
  // renders them differently.
  blend: position.blend
    ? {
        supply: (position.blend.supply || []).map(mapSupplyRow),
        borrow: (position.blend.borrow || []).map(mapBorrowRow),
      }
    : undefined,
});

/**
 * Assets that can be deposited into a Blend pool, with each pool's headline
 * rate. Already filtered by the backend's operator-curated allowlist, so on a
 * configured deployment this is the Fixed Pool only.
 *
 * Powers the Choose Token screen; `supply_apy + emissions_supply_apr` is the
 * badge figure.
 */
export const getBlendEarnOptions = async ({
  networkDetails,
}: {
  networkDetails: NetworkDetails;
}): Promise<BlendEarnAssetOption[]> => {
  const { status, body } = await fetchBackendV2({
    method: "GET",
    path: `/protocols/blend/earn-options?network=${networkDetails.network}`,
  });

  // A 200 without a `data` payload is still a failure — returning undefined
  // would violate the return contract, and the caller's try/catch only handles
  // throws, not bad returns.
  const parsed = body as { data?: ApiBlendEarnOptionsCatalog };
  if (status !== 200 || !parsed?.data) {
    const _err = JSON.stringify(body);
    captureException(`Failed to fetch Blend earn options - ${status}: ${_err}`);
    throw new Error(_err);
  }

  return (parsed.data.options || []).map(mapEarnAssetOption);
};

/**
 * The full pool catalog — unfiltered by the earn allowlist. Used for the pool
 * details sheet's Lending Interest / Current Net APY / Supplied / Borrowed /
 * Backstop rows.
 */
export const getBlendPools = async ({
  networkDetails,
}: {
  networkDetails: NetworkDetails;
}): Promise<BlendCatalogPool[]> => {
  const { status, body } = await fetchBackendV2({
    method: "GET",
    path: `/protocols/blend/pools?network=${networkDetails.network}`,
  });

  const parsed = body as { data?: ApiBlendPoolsCatalog };
  if (status !== 200 || !parsed?.data) {
    const _err = JSON.stringify(body);
    captureException(`Failed to fetch Blend pools - ${status}: ${_err}`);
    throw new Error(_err);
  }

  return (parsed.data.pools || []).map(mapCatalogPool);
};

/**
 * Every Blend position the account holds, across every pool the indexer tracks.
 *
 * Powers the Home Positions tab and the pool sheet's "Your position" panel. This
 * is the full payload behind the narrow `getBlendSuppliedTokens` below, which
 * exists only because it predates this client — see the design doc's Deferred
 * work for retiring it.
 *
 * The endpoint is a batch keyed by address; we always ask for one and unwrap it.
 * An account unknown to the indexer still gets an entry with empty `positions`,
 * so an empty result is a legitimate answer rather than an error.
 */
export const getBlendPositions = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<AccountPositions> => {
  const { status, body } = await fetchBackendV2({
    method: "POST",
    path: `/accounts/positions?network=${networkDetails.network}`,
    body: JSON.stringify({ addresses: [publicKey] }),
  });

  const parsed = body as { data?: ApiAccountPositions[] };
  if (status !== 200 || !parsed?.data) {
    const _err = JSON.stringify(body);
    captureException(`Failed to fetch Blend positions - ${status}: ${_err}`);
    throw new Error(_err);
  }

  const entry = parsed.data[0];
  if (!entry) {
    return {
      address: publicKey,
      totalValueUsd: null,
      netApy: null,
      positions: [],
      backstop: [],
    };
  }

  return {
    address: entry.address,
    totalValueUsd: entry.total_value_usd ?? null,
    netApy: entry.net_apy ?? null,
    positions: (entry.positions || []).map(mapPoolPosition),
    backstop: (entry.backstop || []).map(mapBackstopRow),
  };
};

/**
 * NOTE: superseded by `getBlendPositions` above, which returns this same payload
 * in full. Kept while EarnAmount still calls it; see the design doc's Deferred
 * work for the swap-over.
 *
 * The account's existing supplied balance for one (pool, asset), in raw token
 * units. This is the "before" side of the Review screen's `0.00 -> 500.00`.
 *
 * Reads `total_tokens` — the sum of the plain-supply and collateral buckets.
 * Deposits use SupplyCollateral, so the balance lands in `collateral_tokens` and
 * reading `supplied_tokens` would always report zero.
 *
 * Returns "0" for an account with no position, which is indistinguishable by
 * design from an account unknown to the indexer.
 *
 * Callers should treat a rejection as non-fatal and render the "after" value
 * alone — a stale before-value must never block a deposit.
 */
export const getBlendSuppliedTokens = async ({
  publicKey,
  poolId,
  assetId,
  networkDetails,
}: {
  publicKey: string;
  poolId: string;
  assetId: string;
  networkDetails: NetworkDetails;
}): Promise<string> => {
  const { status, body } = await fetchBackendV2({
    method: "POST",
    path: `/accounts/positions?network=${networkDetails.network}`,
    body: JSON.stringify({ addresses: [publicKey] }),
  });

  // The endpoint is a batch: `data` is an array with one entry per requested
  // address, so unwrap the single element we asked for.
  const parsed = body as { data?: ApiAccountPositions[] };
  if (status !== 200 || !parsed?.data) {
    const _err = JSON.stringify(body);
    captureException(`Failed to fetch Blend positions - ${status}: ${_err}`);
    throw new Error(_err);
  }

  const supplyRow = parsed.data[0]?.positions
    ?.find((position) => position.id === poolId)
    ?.blend?.supply?.find((row) => row.asset_id === assetId);

  return supplyRow?.total_tokens || "0";
};
