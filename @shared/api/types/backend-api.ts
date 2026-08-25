import { AssetBalance, NativeBalance, TokenBalance } from "./types";

export interface BalanceMap {
  [key: string]: AssetBalance | NativeBalance | TokenBalance;
  native: NativeBalance;
}

export type Balances = BalanceMap | null;

export interface AccountBalancesInterface {
  balances: Balances;
  isFunded: boolean | null;
  subentryCount: number;
  error?: { horizon: any; soroban: any };
  /**
   * Contract IDs whose presence in `balances` comes from the user's locally
   * saved custom-token list rather than from the backend. These are the only
   * tokens a user can remove from their balances view — everything the backend
   * returns on its own can be hidden but not removed, because removing the
   * local entry would not stop the backend from returning it.
   */
  localOnlyTokenIds?: string[];
}

// ---------------------------------------------------------------------------
// freighter-backend-v2 `POST /accounts/balances` wire types.
// All keys are snake_case — this mirrors the REST response types in
// freighter-backend-v2 internal/types/account_balances.go verbatim (verified
// against the deployed dev instance). `total` is the on-ledger amount and
// `available` is the server-computed spendable portion (total minus the
// reserved amount for native/classic; equal to total for contract tokens
// and pool shares). `key` and `token` are the server-derived v1 balance-map
// key and token identity, so clients index balances without re-deriving them.
// ---------------------------------------------------------------------------

export type V2TokenType =
  | "NATIVE"
  | "CLASSIC"
  | "SAC"
  | "SEP41"
  | "LIQUIDITY_POOL";

export interface V2TokenIssuer {
  key: string;
}

// v1-pattern token identity. `type` is omitted for SEP-41 tokens and `issuer`
// is omitted for the native asset, matching the v1 shapes.
export interface V2Token {
  type?: string;
  code: string;
  issuer?: V2TokenIssuer;
}

export interface V2BalanceBase {
  // v1-format balance-map key: "native" / "CODE:ISSUER" /
  // "SYMBOL:CONTRACT_ID" / "POOLID:lp".
  key: string;
  // Present on every variant except LIQUIDITY_POOL (LP shares carry no token
  // in v1). Each variant below narrows it to what the server guarantees.
  token?: V2Token;
  total: string;
  available: string;
  token_id: string;
  token_type: V2TokenType;
}

export interface V2NativeBalance extends V2BalanceBase {
  token_type: "NATIVE";
  token: { type: "native"; code: "XLM" };
  // Base reserve requirement (excludes liabilities):
  // (2 + numSubentries + numSponsoring - numSponsored) * baseReserve.
  minimum_balance: string;
  buying_liabilities: string;
  selling_liabilities: string;
  last_modified_ledger?: number;
}

export interface V2ClassicBalance extends V2BalanceBase {
  token_type: "CLASSIC";
  // `type` is the trustline's asset type verbatim (e.g. credit_alphanum4).
  token: { type: string; code: string; issuer: V2TokenIssuer };
  code?: string;
  issuer?: string;
  type: string;
  limit: string;
  buying_liabilities: string;
  selling_liabilities: string;
  last_modified_ledger?: number;
  is_authorized: boolean;
  is_authorized_to_maintain_liabilities: boolean;
}

export interface V2SacBalance extends V2BalanceBase {
  token_type: "SAC";
  // `type` is derived server-side from the code length (credit_alphanum4/12).
  token: { type: string; code: string; issuer: V2TokenIssuer };
  code: string;
  issuer: string;
  decimals: number;
  is_authorized?: boolean;
  is_clawback_enabled?: boolean;
}

// `total` is the raw i128 amount as a decimal string, NOT scaled by
// `decimals` — display logic scales it.
export interface V2Sep41Balance extends V2BalanceBase {
  token_type: "SEP41";
  // A pure SEP-41 token has no classic asset type; `issuer.key` is the
  // contract id.
  token: { code: string; issuer: V2TokenIssuer };
  name?: string;
  symbol?: string;
  decimals: number;
  last_modified_ledger?: number;
}

export interface V2LiquidityPoolReserve {
  asset: string;
  amount: string;
}

export interface V2LiquidityPoolBalance extends V2BalanceBase {
  token_type: "LIQUIDITY_POOL";
  token?: undefined;
  liquidity_pool_id: string;
  reserves: V2LiquidityPoolReserve[];
  last_modified_ledger?: number;
}

export type V2Balance =
  | V2NativeBalance
  | V2ClassicBalance
  | V2SacBalance
  | V2Sep41Balance
  | V2LiquidityPoolBalance;

export interface V2AccountBalances {
  address: string;
  is_funded: boolean;
  subentry_count: number;
  balances: V2Balance[];
}
