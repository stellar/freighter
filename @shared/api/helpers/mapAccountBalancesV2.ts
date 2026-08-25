import BigNumber from "bignumber.js";

import {
  ClassicAsset,
  LiquidityPoolShareAsset,
  NativeAsset,
  SorobanAsset,
} from "../types/account-balance";
import { BlockAidScanAssetResult } from "../types";
import {
  AccountBalancesInterface,
  BalanceMap,
  V2AccountBalances,
  V2ClassicBalance,
  V2LiquidityPoolBalance,
  V2NativeBalance,
  V2SacBalance,
  V2Sep41Balance,
} from "../types/backend-api";

/**
 * Normalizes a freighter-backend-v2 `/accounts/balances` per-account result into
 * the legacy `AccountBalancesInterface` shape the extension consumes everywhere
 * (see `docs/balances-api-fields.md`). Keeping the output identical to what
 * `getAccountIndexerBalances` (the v1 path) returns means the ~24 downstream
 * consumers, the cache duck, and the balance helpers need no changes.
 *
 * This is a MINIMAL adapter: it bridges every rename/reshape and leaves the
 * truly backend-dependent fields at safe defaults until the v2 API provides
 * them:
 *   - `blockaidData` → undefined (no spam/scam badges)
 *
 * `total` and `available` are both server-provided and converted to BigNumber
 * here, mirroring the v1 path. `minimumBalance` is re-derived as
 * `minimum_balance + selling_liabilities` because the v1 contract folds
 * selling liabilities into it (see `mapNative`).
 *
 * The balance-map `key` and the `token` identity are server-provided (v1
 * conventions: `native` / `"<code>:<issuer>"` / `"<symbol>:<contractId>"` /
 * `"<liquidityPoolId>:lp"` — the formats `sortBalances` and
 * `filterHiddenBalances` in `popup/helpers/account.ts` rely on) and pass
 * through verbatim — no per-asset identity logic lives client-side.
 */

// The mapper emits the runtime `AssetType` shapes from account-balance.ts —
// the shapes the type guards in `popup/helpers/balance.ts` discriminate on —
// with two deltas relative to those declarations:
//   - `blockaidData` is stamped by `addBlockaidScanResults` AFTER mapping, so
//     here it is explicitly `undefined` (the declared types require it).
//   - v2 has no trustline `limit` for LP shares, and consumers never read it
//     (see docs/balances-api-fields.md §3), so it is omitted.
type ScanPending = { blockaidData: BlockAidScanAssetResult | undefined };

type MappedNative = Omit<NativeAsset, "blockaidData"> & ScanPending;
// `limit` is optional: present on CLASSIC (v1 wire parity, never read by
// consumers), absent on SAC (no trustline exists).
type MappedClassic = Omit<ClassicAsset, "blockaidData"> &
  ScanPending & { limit?: BigNumber };
type MappedSoroban = SorobanAsset & ScanPending & { available: BigNumber };
type MappedLiquidityPool = Omit<LiquidityPoolShareAsset, "limit"> & ScanPending;

type MappedBalance =
  | MappedNative
  | MappedClassic
  | MappedSoroban
  | MappedLiquidityPool;

interface MappedEntry {
  key: string;
  value: MappedBalance;
}

const mapNative = (
  b: V2NativeBalance,
): { key: string; value: MappedNative } => ({
  key: b.key,
  value: {
    token: b.token,
    total: new BigNumber(b.total),
    available: new BigNumber(b.available),
    // v2's minimum_balance is the bare base-reserve requirement (excludes
    // liabilities), but the legacy contract folds selling liabilities in:
    // getAvailableBalance (popup/helpers/soroban.ts) computes spendable XLM
    // as total − minimumBalance, so without this the max-send/swap cap
    // exceeds spendable XLM by the selling-liabilities amount.
    minimumBalance: new BigNumber(b.minimum_balance)
      .plus(b.selling_liabilities)
      .toString(),
    buyingLiabilities: b.buying_liabilities,
    sellingLiabilities: b.selling_liabilities,
    blockaidData: undefined,
  },
});

const mapClassic = (
  b: V2ClassicBalance,
): { key: string; value: MappedClassic } => ({
  key: b.key,
  value: {
    token: b.token,
    total: new BigNumber(b.total),
    available: new BigNumber(b.available),
    limit: new BigNumber(b.limit || "0"),
    buyingLiabilities: b.buying_liabilities,
    sellingLiabilities: b.selling_liabilities,
    blockaidData: undefined,
  },
});

// A SAC balance is a classic asset (code + G-address issuer) held via contract.
// The server pre-formats `total` as decimal (like classic), so we map it to a
// classic-shaped balance rather than the Soroban shape — the Soroban display
// path re-scales by `decimals`, which would double-scale an already-formatted
// SAC amount. No trustline liabilities exist on a SAC (available = total
// server-side).
const mapSac = (b: V2SacBalance): { key: string; value: MappedClassic } => ({
  key: b.key,
  value: {
    token: b.token,
    total: new BigNumber(b.total),
    available: new BigNumber(b.available),
    buyingLiabilities: "0",
    sellingLiabilities: "0",
    blockaidData: undefined,
  },
});

// A pure SEP-41 token maps to the Soroban shape: `total` is a raw i128 that
// display logic scales by `decimals`. `token.issuer.key` is the contract id,
// matching the standalone Soroban convention.
const mapSep41 = (
  b: V2Sep41Balance,
): { key: string; value: MappedSoroban } => ({
  key: b.key,
  value: {
    token: b.token,
    contractId: b.token_id,
    total: new BigNumber(b.total),
    available: new BigNumber(b.available),
    symbol: b.symbol || "",
    name: b.name || "",
    decimals: b.decimals,
    blockaidData: undefined,
  },
});

// LP shares map to the legacy `<poolId>:lp` entry: no token identity, just
// the share total plus the pool's constituent reserves ({asset, amount}[]),
// which is the same shape as Horizon's Reserve[] that the LP-name rendering
// in AccountAssets reads.
const mapLiquidityPool = (
  b: V2LiquidityPoolBalance,
): { key: string; value: MappedLiquidityPool } => ({
  key: b.key,
  value: {
    liquidityPoolId: b.liquidity_pool_id,
    total: new BigNumber(b.total),
    available: new BigNumber(b.available),
    reserves: b.reserves,
    blockaidData: undefined,
  },
});

export const mapAccountBalancesV2 = (
  account: V2AccountBalances,
): AccountBalancesInterface => {
  const balances: Record<string, MappedBalance> = {};
  const v2Balances = account.balances || [];

  for (const balance of v2Balances) {
    let entry: MappedEntry | null = null;
    switch (balance.token_type) {
      case "NATIVE":
        entry = mapNative(balance);
        break;
      case "CLASSIC":
        entry = mapClassic(balance);
        break;
      case "SAC":
        entry = mapSac(balance);
        break;
      case "SEP41":
        entry = mapSep41(balance);
        break;
      case "LIQUIDITY_POOL":
        entry = mapLiquidityPool(balance);
        break;
      default:
        // Unknown token type — skip rather than emit a malformed entry.
        entry = null;
    }
    if (entry) {
      balances[entry.key] = entry.value;
    }
  }

  return {
    // Single cast at the boundary: the legacy BalanceMap declarations
    // over-promise relative to every runtime path (v1 included) — they
    // require `blockaidData` (stamped after mapping), a `token` on LP
    // entries, and `limit`/`token.type` on Soroban entries, none of which
    // exist at runtime. The mapped shapes above are the runtime truth.
    balances: balances as unknown as BalanceMap,
    isFunded: account.is_funded,
    subentryCount: account.subentry_count,
  };
};
