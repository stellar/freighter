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
}

// ---------------------------------------------------------------------------
// freighter-backend-v2 `POST /accounts/balances` wire types.
// All keys are snake_case — this mirrors the REST response types in
// freighter-backend-v2 internal/types/account_balances.go verbatim (verified
// against the deployed dev instance). `balance` is the on-ledger amount and
// `available` is the server-computed spendable portion (balance minus the
// reserved amount for native/classic; equal to balance for contract tokens
// and pool shares).
// ---------------------------------------------------------------------------

export type V2TokenType =
  | "NATIVE"
  | "CLASSIC"
  | "SAC"
  | "SEP41"
  | "LIQUIDITY_POOL";

export interface V2BalanceBase {
  balance: string;
  available: string;
  token_id: string;
  token_type: V2TokenType;
}

export interface V2NativeBalance extends V2BalanceBase {
  token_type: "NATIVE";
  // Base reserve requirement (excludes liabilities):
  // (2 + numSubentries + numSponsoring - numSponsored) * baseReserve.
  minimum_balance: string;
  buying_liabilities: string;
  selling_liabilities: string;
  last_modified_ledger?: number;
}

export interface V2ClassicBalance extends V2BalanceBase {
  token_type: "CLASSIC";
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
  code: string;
  issuer: string;
  decimals: number;
  is_authorized?: boolean;
  is_clawback_enabled?: boolean;
}

// `balance` is the raw i128 amount as a decimal string, NOT scaled by
// `decimals` — display logic scales it.
export interface V2Sep41Balance extends V2BalanceBase {
  token_type: "SEP41";
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
