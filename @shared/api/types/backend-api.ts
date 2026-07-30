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

/* ─────────────────────────────────────────────────────────────────────────────
 * Account history — freighter-backend-v2
 * `GET /api/v1/accounts/{address}/transactions`
 *
 * Source of truth: stellar/freighter-backend-v2
 * `internal/types/account_history.go` + `internal/api/handlers/account_history.go`
 * (wire format is snake_case; the backend maps wallet-backend upstream data
 * into these shapes server-side — this client never talks to wallet-backend).
 *
 * Query params: `network=PUBLIC|TESTNET` (required), `limit` (default set by
 * backend config, max 100), `direction=next|prev`, `cursor` (opaque),
 * `since`/`until` (RFC3339). Address may be G... or C....
 *
 * Field encodings (verified against freighter-backend-v2 types and the
 * wallet-backend processors/resolvers that produce the values):
 * - Timestamps            → RFC3339 strings, e.g. "2024-04-08T14:33:00Z"
 * - `fee_charged`, `id`   → int64 values string-encoded by the backend
 *   (`json:",string"`) so TOIDs above 2^53-1 survive JSON parsing.
 * - `amount`              → smallest-unit integer string (7 decimals for
 *   classic assets and SAC-wrapped classic, token decimals for SEP-41),
 *   always positive; direction comes from `reason` (DEBIT/BURN vs CREDIT/MINT).
 * - `*_token_id`          → token CONTRACT address (C...), including the
 *   native XLM SAC and SACs for classic assets.
 * - `signer_weights`      → JSON string: {"old": 1 | null, "new": 2 | null}
 * - `thresholds`          → JSON string: {"old": "2" | null, "new": "3" | null}
 * - `limit` (trustline)   → JSON string: {"old": "1000.0000000" | null, "new":
 *   "10000.0000000" | null} (decimal strings, Horizon-effect style)
 * - `metadata_key_value`  → JSON string. Data entries: {"<key_name>": {"old":
 *   "<base64>", "new": "<base64>"}} (old/new present per reason). Home domain:
 *   {"home_domain": {"old": "stellar.org", "new": "stellar.com"}}
 * - `flags`               → string names: account flags "auth_required" |
 *   "auth_revocable" | "auth_immutable" | "auth_clawback_enabled"; trustline
 *   auth flags "authorized" | "authorized_to_maintain_liabilities" |
 *   "clawback_enabled"
 * - `operation_xdr`       → base64 of a single xdr.Operation (decodable with
 *   stellar-sdk `xdr.Operation.fromXDR(value, "base64")`)
 * - `operations` and `state_changes` are scoped to the QUERIED account — they
 *   are not the transaction's full contents.
 * - Fee state changes appear as their own BALANCE/DEBIT entry (fees are
 *   transaction-level, netted across fee + refund events). NOTE: the v2 shape
 *   carries no operation linkage on state changes, so fee entries are not
 *   structurally distinguishable — flagged as a backend follow-up.
 * ──────────────────────────────────────────────────────────────────────────── */

export type StateChangeCategory =
  | "BALANCE"
  | "ACCOUNT"
  | "SIGNER"
  | "SIGNATURE_THRESHOLD"
  | "METADATA"
  | "FLAGS"
  | "TRUSTLINE"
  | "RESERVES"
  | "BALANCE_AUTHORIZATION";

export type StateChangeReason =
  | "CREATE"
  | "MERGE"
  | "DEBIT"
  | "CREDIT"
  | "MINT"
  | "BURN"
  | "ADD"
  | "REMOVE"
  | "UPDATE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "HOME_DOMAIN"
  | "SET"
  | "CLEAR"
  | "DATA_ENTRY"
  | "SPONSOR"
  | "UNSPONSOR";

export type V2OperationType =
  | "CREATE_ACCOUNT"
  | "PAYMENT"
  | "PATH_PAYMENT_STRICT_RECEIVE"
  | "PATH_PAYMENT_STRICT_SEND"
  | "MANAGE_SELL_OFFER"
  | "CREATE_PASSIVE_SELL_OFFER"
  | "MANAGE_BUY_OFFER"
  | "SET_OPTIONS"
  | "CHANGE_TRUST"
  | "ALLOW_TRUST"
  | "ACCOUNT_MERGE"
  | "INFLATION"
  | "MANAGE_DATA"
  | "BUMP_SEQUENCE"
  | "CREATE_CLAIMABLE_BALANCE"
  | "CLAIM_CLAIMABLE_BALANCE"
  | "BEGIN_SPONSORING_FUTURE_RESERVES"
  | "END_SPONSORING_FUTURE_RESERVES"
  | "REVOKE_SPONSORSHIP"
  | "CLAWBACK"
  | "CLAWBACK_CLAIMABLE_BALANCE"
  | "SET_TRUST_LINE_FLAGS"
  | "LIQUIDITY_POOL_DEPOSIT"
  | "LIQUIDITY_POOL_WITHDRAW"
  | "INVOKE_HOST_FUNCTION"
  | "EXTEND_FOOTPRINT_TTL"
  | "RESTORE_FOOTPRINT";

export interface V2Operation {
  /** TOID — int64 string-encoded by the backend */
  id: string;
  operation_type: V2OperationType;
  /** base64 xdr.Operation */
  operation_xdr: string;
  /** e.g. "op_success" */
  result_code: string;
  successful: boolean;
  ledger_number: number;
  ledger_created_at: string;
  ingested_at: string;
}

interface V2StateChangeBase {
  type: StateChangeCategory;
  reason: StateChangeReason;
  ledger_number: number;
  ledger_created_at: string;
  ingested_at: string;
}

export interface V2StandardBalanceChange extends V2StateChangeBase {
  type: "BALANCE";
  reason: "DEBIT" | "CREDIT" | "MINT" | "BURN";
  /** token contract address (C...) */
  standard_balance_token_id: string;
  /** smallest-unit integer string, always positive */
  amount: string;
}

export interface V2AccountChange extends V2StateChangeBase {
  type: "ACCOUNT";
  reason: "CREATE" | "MERGE";
  funder_address?: string;
}

export interface V2SignerChange extends V2StateChangeBase {
  type: "SIGNER";
  reason: "ADD" | "REMOVE" | "UPDATE";
  signer_address?: string;
  /** JSON string {"old": number|null, "new": number|null} */
  signer_weights?: string;
}

export interface V2SignerThresholdsChange extends V2StateChangeBase {
  type: "SIGNATURE_THRESHOLD";
  reason: "LOW" | "MEDIUM" | "HIGH";
  /** JSON string {"old": "2"|null, "new": "3"|null} */
  thresholds: string;
}

export interface V2MetadataChange extends V2StateChangeBase {
  type: "METADATA";
  reason: "DATA_ENTRY" | "HOME_DOMAIN";
  /** JSON string; see block comment above for data-entry vs home-domain shapes */
  metadata_key_value: string;
}

export interface V2FlagsChange extends V2StateChangeBase {
  type: "FLAGS";
  reason: "SET" | "CLEAR";
  flags: string[];
}

export interface V2TrustlineChange extends V2StateChangeBase {
  type: "TRUSTLINE";
  reason: "CREATE" | "UPDATE" | "REMOVE";
  /** token contract address (C...) */
  trustline_token_id?: string;
  /** JSON string {"old": "1000.0000000"|null, "new": "10000.0000000"|null} */
  limit?: string;
  trustline_liquidity_pool_id?: string;
}

export interface V2ReservesChange extends V2StateChangeBase {
  type: "RESERVES";
  reason: "SPONSOR" | "UNSPONSOR";
  sponsored_address?: string;
  sponsor_address?: string;
  sponsored_data?: string;
  sponsored_trustline?: string;
  claimable_balance_id?: string;
  liquidity_pool_id?: string;
}

export interface V2BalanceAuthorizationChange extends V2StateChangeBase {
  type: "BALANCE_AUTHORIZATION";
  reason: "SET" | "CLEAR";
  balance_auth_token_id?: string;
  balance_auth_liquidity_pool_id?: string;
  flags: string[];
}

/** Discriminated on `type` — 1:1 with StateChangeCategory */
export type V2StateChange =
  | V2StandardBalanceChange
  | V2AccountChange
  | V2SignerChange
  | V2SignerThresholdsChange
  | V2MetadataChange
  | V2FlagsChange
  | V2TrustlineChange
  | V2ReservesChange
  | V2BalanceAuthorizationChange;

/**
 * One transaction plus the queried account's operations and state changes
 * within it. Transaction fields are promoted to the top level (Go embedding).
 */
export interface V2AccountTransaction {
  hash: string;
  /** stroops — int64 string-encoded by the backend */
  fee_charged: string;
  /** e.g. "tx_success" | "tx_failed" */
  result_code: string;
  ledger_number: number;
  ledger_created_at: string;
  is_fee_bump: boolean;
  ingested_at: string;
  operations: V2Operation[];
  state_changes: V2StateChange[];
}

export interface V2PaginationInfo {
  next_cursor: string | null;
  prev_cursor: string | null;
  has_next: boolean;
  has_previous: boolean;
}

/** PaginatedResponse[AccountTransaction] envelope */
export interface AccountHistoryV2Response {
  data: V2AccountTransaction[];
  pagination: V2PaginationInfo;
}
