import BigNumber from "bignumber.js";
import { AssetType as SdkAssetType } from "stellar-sdk";

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
 * `total` and `available` are both server-provided (`balance`/`available`) and
 * converted to BigNumber here, mirroring the v1 path.
 *
 * Key formats match the v1/standalone conventions that `sortBalances` and
 * `filterHiddenBalances` (`popup/helpers/account.ts`) rely on:
 *   - native → `"native"`
 *   - classic / SAC → `"<code>:<issuer>"`
 *   - SEP-41 token → `"<symbol>:<contractId>"`
 *   - liquidity-pool share → `"<liquidityPoolId>:lp"`
 */

const classicAssetType = (code: string): SdkAssetType =>
  (code.length > 4 ? "credit_alphanum12" : "credit_alphanum4") as SdkAssetType;

interface MappedEntry {
  key: string;
  // Runtime shape matches the legacy BalanceMap entries; some strict fields
  // (e.g. `blockaidData`) are intentionally undefined until v2 provides them.
  value: any;
}

const mapNative = (b: V2NativeBalance): MappedEntry => ({
  key: "native",
  value: {
    token: { type: "native", code: "XLM" },
    total: new BigNumber(b.balance),
    available: new BigNumber(b.available),
    minimumBalance: b.minimum_balance,
    buyingLiabilities: b.buying_liabilities,
    sellingLiabilities: b.selling_liabilities,
    blockaidData: undefined,
  },
});

const mapClassic = (b: V2ClassicBalance): MappedEntry => {
  const code = b.code || "";
  const issuer = b.issuer || "";
  return {
    key: `${code}:${issuer}`,
    value: {
      token: {
        type: classicAssetType(code),
        code,
        issuer: { key: issuer },
      },
      total: new BigNumber(b.balance),
      available: new BigNumber(b.available),
      limit: new BigNumber(b.limit || "0"),
      buyingLiabilities: b.buying_liabilities,
      sellingLiabilities: b.selling_liabilities,
      blockaidData: undefined,
    },
  };
};

// A SAC balance is a classic asset (code + G-address issuer) held via contract.
// The server pre-formats `balance` as decimal (like classic), so we map it to a
// classic-shaped balance rather than the Soroban shape — the Soroban display
// path re-scales by `decimals`, which would double-scale an already-formatted
// SAC amount. No trustline liabilities exist on a SAC (available = balance
// server-side).
const mapSac = (b: V2SacBalance): MappedEntry => ({
  key: `${b.code}:${b.issuer}`,
  value: {
    token: {
      type: classicAssetType(b.code),
      code: b.code,
      issuer: { key: b.issuer },
    },
    total: new BigNumber(b.balance),
    available: new BigNumber(b.available),
    buyingLiabilities: "0",
    sellingLiabilities: "0",
    blockaidData: undefined,
  },
});

// A pure SEP-41 token maps to the Soroban shape: `balance` is a raw i128 that
// display logic scales by `decimals`. `issuer.key` is the contract id, matching
// the standalone Soroban convention.
const mapSep41 = (b: V2Sep41Balance): MappedEntry => {
  const symbol = b.symbol || "";
  const name = b.name || "";
  return {
    key: `${symbol}:${b.token_id}`,
    value: {
      token: { code: symbol, issuer: { key: b.token_id } },
      contractId: b.token_id,
      total: new BigNumber(b.balance),
      available: new BigNumber(b.available),
      symbol,
      name,
      decimals: b.decimals,
      blockaidData: undefined,
    },
  };
};

// LP shares map to the legacy `<poolId>:lp` entry: no token identity, just
// the share total plus the pool's constituent reserves ({asset, amount}[]),
// which is the same shape as Horizon's Reserve[] that the LP-name rendering
// in AccountAssets reads.
const mapLiquidityPool = (b: V2LiquidityPoolBalance): MappedEntry => ({
  key: `${b.liquidity_pool_id}:lp`,
  value: {
    liquidityPoolId: b.liquidity_pool_id,
    total: new BigNumber(b.balance),
    available: new BigNumber(b.available),
    reserves: b.reserves,
    blockaidData: undefined,
  },
});

export const mapAccountBalancesV2 = (
  account: V2AccountBalances | undefined,
): AccountBalancesInterface => {
  const balances = {} as any;
  const v2Balances = account?.balances || [];

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
    balances: balances as BalanceMap,
    // Envelope fields come straight from the v2 response; an account missing
    // from the fan-out result reads as unfunded.
    isFunded: account?.is_funded ?? false,
    subentryCount: account?.subentry_count ?? 0,
  };
};
