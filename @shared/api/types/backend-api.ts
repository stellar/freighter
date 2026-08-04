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
 * - `token_id`            → token CONTRACT address (C...), including the
 *   native XLM SAC and SACs for classic assets. Trustline and
 *   balance-authorization changes carry `liquidity_pool_id` instead when the
 *   subject is a pool share.
 * - old/new values      → typed per variant (`old_weight`/`new_weight`,
 *   `old_threshold`/`new_threshold`, `old_limit`/`new_limit`,
 *   `old_value`/`new_value`, `old_home_domain`/`new_home_domain`). Each variant
 *   only carries the fields its verb defines, so a missing field never doubles
 *   as "empty" — the JSON-blob encodings the earlier wire shape used are gone.
 * - `flags`               → SDK enum spelling, upper-case: account flags
 *   "AUTH_REQUIRED" | "AUTH_REVOCABLE" | "AUTH_IMMUTABLE" |
 *   "AUTH_CLAWBACK_ENABLED"; trustline auth flags "AUTHORIZED" |
 *   "AUTHORIZED_TO_MAINTAIN_LIABILITIES" | "CLAWBACK_ENABLED"
 * - `operation_xdr`       → base64 of a single xdr.Operation (decodable with
 *   stellar-sdk `xdr.Operation.fromXDR(value, "base64")`)
 * - `operations` and `state_changes` are scoped to the QUERIED account — they
 *   are not the transaction's full contents.
 * - Fee state changes appear as their own BALANCE/DEBIT entry (fees are
 *   transaction-level, netted across fee + refund events). NOTE: the v2 shape
 *   carries no operation linkage on state changes, so fee entries are not
 *   structurally distinguishable — flagged as a backend follow-up. Confirmed
 *   against live dev data 2026-07-30: no state change carries an operation id.
 * ──────────────────────────────────────────────────────────────────────────── */

export type StateChangeCategory =
  | "BALANCE"
  | "ACCOUNT"
  | "SIGNER"
  | "SIGNATURE_THRESHOLD"
  | "DATA_ENTRY"
  | "HOME_DOMAIN"
  | "ALLOWANCE"
  | "FLAGS"
  | "TRUSTLINE"
  | "BALANCE_AUTHORIZATION"
  // Blend v2 lending categories — see the BLEND_* note below
  | "BLEND_SUPPLY"
  | "BLEND_COLLATERAL"
  | "BLEND_DEBT"
  | "BLEND_AUCTION"
  | "BLEND_EMISSIONS"
  | "BLEND_BACKSTOP_EMISSIONS"
  | "BLEND_BACKSTOP"
  | "BLEND_BACKSTOP_QUEUE";

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
  | "SET"
  | "CLEAR"
  // Blend v2 actions with no generic equivalent. Amount-bearing Blend
  // positions reuse CREDIT/DEBIT, the backstop queue reuses ADD/REMOVE, and
  // defaulted debt reuses BURN.
  | "BORROW"
  | "REPAY"
  | "FLASH_LOAN"
  | "BAD_DEBT"
  | "FILL"
  | "CLAIM";

/** Which of the account's three signature thresholds a ThresholdChange refers to */
export type ThresholdLevel = "LOW" | "MEDIUM" | "HIGH";

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

/**
 * Every state change carries `variant` — the concrete wallet-backend GraphQL
 * type name. Each (type, reason) pair maps to exactly one variant, so switch on
 * `variant` alone rather than on the pair.
 */
interface V2StateChangeBase {
  variant: string;
  type: StateChangeCategory;
  reason: StateChangeReason;
  ledger_number: number;
  ledger_created_at: string;
  ingested_at: string;
}

/**
 * A movement of value on the account's token balance. Also carries transaction
 * fees, which arrive as (BALANCE, DEBIT) rows — see the fee note above.
 */
export interface V2BalanceChange extends V2StateChangeBase {
  variant: "BalanceChange";
  type: "BALANCE";
  reason: "DEBIT" | "CREDIT" | "MINT" | "BURN";
  /**
   * Token contract address (C...). Classic assets and native XLM arrive as
   * their SAC contract id, never as code:issuer.
   */
  token_id: string;
  /** smallest-unit integer string, always positive */
  amount: string;
  /** CAP-67 destination memo on SEP-41 transfers; decimal string (u64) */
  to_muxed_id?: string;
}

/** A classic account creation or a contract deployment */
export interface V2AccountCreatedChange extends V2StateChangeBase {
  variant: "AccountCreatedChange";
  type: "ACCOUNT";
  reason: "CREATE";
  /** funding account (classic) or deploying address (contract) */
  creator_address: string;
}

export interface V2AccountMergedChange extends V2StateChangeBase {
  variant: "AccountMergedChange";
  type: "ACCOUNT";
  reason: "MERGE";
  destination_address: string;
}

export interface V2SignerAddedChange extends V2StateChangeBase {
  variant: "SignerAddedChange";
  type: "SIGNER";
  reason: "ADD";
  signer_address: string;
  new_weight: number;
}

export interface V2SignerUpdatedChange extends V2StateChangeBase {
  variant: "SignerUpdatedChange";
  type: "SIGNER";
  reason: "UPDATE";
  signer_address: string;
  /** a locked master key's prior weight is 0, not absent */
  old_weight: number;
  new_weight: number;
}

export interface V2SignerRemovedChange extends V2StateChangeBase {
  variant: "SignerRemovedChange";
  type: "SIGNER";
  reason: "REMOVE";
  signer_address: string;
  /**
   * Always sent by the backend. Optional only because the Horizon fallback
   * (custom networks) synthesizes this change and cannot know the prior weight.
   */
  old_weight?: number;
}

export interface V2ThresholdChange extends V2StateChangeBase {
  variant: "ThresholdChange";
  type: "SIGNATURE_THRESHOLD";
  reason: "UPDATE";
  /** which of the three thresholds changed */
  threshold: ThresholdLevel;
  /**
   * Always sent by the backend. Optional only because the Horizon fallback
   * (custom networks) synthesizes this change and cannot know the prior value.
   */
  old_threshold?: number;
  new_threshold: number;
}

export interface V2AccountFlagsChange extends V2StateChangeBase {
  variant: "AccountFlagsChange";
  type: "FLAGS";
  reason: "SET" | "CLEAR";
  flags: string[];
}

/** Home domain set on an account that had none */
export interface V2HomeDomainSetChange extends V2StateChangeBase {
  variant: "HomeDomainSetChange";
  type: "HOME_DOMAIN";
  reason: "SET";
  home_domain: string;
}

export interface V2HomeDomainUpdatedChange extends V2StateChangeBase {
  variant: "HomeDomainUpdatedChange";
  type: "HOME_DOMAIN";
  reason: "UPDATE";
  old_home_domain: string;
  new_home_domain: string;
}

export interface V2HomeDomainClearedChange extends V2StateChangeBase {
  variant: "HomeDomainClearedChange";
  type: "HOME_DOMAIN";
  reason: "CLEAR";
  old_home_domain: string;
}

export interface V2DataEntryAddedChange extends V2StateChangeBase {
  variant: "DataEntryAddedChange";
  type: "DATA_ENTRY";
  reason: "ADD";
  name: string;
  /** base64-encoded raw value */
  value: string;
}

export interface V2DataEntryUpdatedChange extends V2StateChangeBase {
  variant: "DataEntryUpdatedChange";
  type: "DATA_ENTRY";
  reason: "UPDATE";
  name: string;
  old_value: string;
  new_value: string;
}

export interface V2DataEntryRemovedChange extends V2StateChangeBase {
  variant: "DataEntryRemovedChange";
  type: "DATA_ENTRY";
  reason: "REMOVE";
  name: string;
  old_value: string;
}

/** A SEP-41 allowance approval */
export interface V2AllowanceChange extends V2StateChangeBase {
  variant: "AllowanceChange";
  type: "ALLOWANCE";
  reason: "UPDATE";
  token_id: string;
  spender: string;
  /** smallest-unit integer string */
  amount: string;
  expiration_ledger: number;
}

/** Trustline variants: exactly one of token_id / liquidity_pool_id is set */
export interface V2TrustlineAddedChange extends V2StateChangeBase {
  variant: "TrustlineAddedChange";
  type: "TRUSTLINE";
  reason: "ADD";
  token_id?: string;
  liquidity_pool_id?: string;
  limit: string;
}

export interface V2TrustlineUpdatedChange extends V2StateChangeBase {
  variant: "TrustlineUpdatedChange";
  type: "TRUSTLINE";
  reason: "UPDATE";
  token_id?: string;
  liquidity_pool_id?: string;
  old_limit: string;
  new_limit: string;
}

export interface V2TrustlineRemovedChange extends V2StateChangeBase {
  variant: "TrustlineRemovedChange";
  type: "TRUSTLINE";
  reason: "REMOVE";
  token_id?: string;
  liquidity_pool_id?: string;
}

export interface V2BalanceAuthorizationChange extends V2StateChangeBase {
  variant: "BalanceAuthorizationChange";
  type: "BALANCE_AUTHORIZATION";
  reason: "SET" | "CLEAR";
  token_id?: string;
  liquidity_pool_id?: string;
  /** absent for SAC contract holders */
  flags?: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Blend v2 protocol state changes — NOT YET SERVED BY ANY DEPLOYED BACKEND.
 *
 * Modelled from the `Blend*Change` GraphQL types on wallet-backend
 * `blend/pr5-graphql` (PR #661), which is open alongside #657–#660 and #664;
 * `main` carries no Blend emitter at all. Three upstream changes have to land
 * before a single one of these reaches the wire:
 *
 *   1. wallet-backend #659 (the processor that writes BLEND_* rows) merged
 *      together with #661 (the GraphQL types). #659 alone makes
 *      `convertStateChangeTypes` error on every Blend row.
 *   2. wallet-backend's Go SDK (`pkg/wbclient/types`) gaining the Blend cases
 *      in `UnmarshalStateChangeNode` — #661 adds the schema but NOT the SDK,
 *      whose `default` arm rejects unknown `__typename`, so today a Blend row
 *      would fail the whole freighter-backend-v2 history request.
 *   3. freighter-backend-v2 bumping that dep and adding the matching arms to
 *      `mapStateChange` (a 19-case switch whose `default` drops every
 *      variant-specific field).
 *
 * Field names below are the snake_case forms fbv2's mapper produces from the
 * GraphQL camelCase, following the convention every existing variant uses
 * (`poolId` → `pool_id`, required → present, nullable → optional).
 *
 * Blend rows are ADDITIVE: the SEP-41 token-transfer processor still emits its
 * own `BalanceChange` for the same movement (separate emitter namespaces —
 * indexer 0, SEP-41 1<<40, Blend 2<<40, so Blend rows sort last). A pool
 * emissions claim therefore reports its amount twice, once as a
 * `BalanceChange` CREDIT and once as a `BlendEmissionsClaimChange`. Never sum
 * amounts across variants.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Uncollateralized supply position in a pool reserve (tokens lent, not backing a borrow) */
export interface V2BlendSupplyChange extends V2StateChangeBase {
  variant: "BlendSupplyChange";
  type: "BLEND_SUPPLY";
  reason: "CREDIT" | "DEBIT";
  /** contract id of the reserve asset supplied or withdrawn */
  token_id: string;
  /** underlying amount, smallest-unit integer string */
  amount: string;
  /** contract id of the Blend pool */
  pool_id: string;
}

/** Collateralized supply position in a pool reserve (tokens posted as borrow collateral) */
export interface V2BlendCollateralChange extends V2StateChangeBase {
  variant: "BlendCollateralChange";
  type: "BLEND_COLLATERAL";
  reason: "CREDIT" | "DEBIT";
  token_id: string;
  /** underlying amount, smallest-unit integer string */
  amount: string;
  pool_id: string;
}

/** Debt position in a pool reserve */
export interface V2BlendDebtChange extends V2StateChangeBase {
  variant: "BlendDebtChange";
  type: "BLEND_DEBT";
  reason: "BORROW" | "REPAY" | "FLASH_LOAN" | "BAD_DEBT" | "BURN";
  token_id: string;
  /**
   * Denomination varies by reason: BORROW / REPAY / FLASH_LOAN carry the
   * underlying amount; BAD_DEBT (debt socialized to the backstop) and BURN
   * (defaulted debt written off) carry dTokens.
   */
  amount: string;
  pool_id: string;
}

/** One asset's raw protocol-token amount within an auction's bid or lot */
export interface V2BlendAuctionAmount {
  asset_contract_id: string;
  /** raw on-chain integer at the asset's native decimals — NOT a USD value */
  amount: string;
}

export type BlendAuctionType = "USER_LIQUIDATION" | "BAD_DEBT" | "INTEREST";

/**
 * One side of a filled Dutch auction. Every fill emits two rows — the
 * liquidated account (or the pool) and the filler — each naming the other as
 * `counterparty`.
 */
export interface V2BlendAuctionChange extends V2StateChangeBase {
  variant: "BlendAuctionChange";
  type: "BLEND_AUCTION";
  reason: "FILL";
  pool_id: string;
  auction_type: BlendAuctionType;
  /** percentage of the auction filled by this fill, 1-100 */
  fill_percent: number;
  /** the other account in the fill */
  counterparty: string;
  /** assets the filler received — USER_LIQUIDATION bTokens, BAD_DEBT backstop LP, INTEREST underlying */
  lot: V2BlendAuctionAmount[];
  /** assets the filler assumed — USER_LIQUIDATION/BAD_DEBT dTokens, INTEREST backstop LP */
  bid: V2BlendAuctionAmount[];
}

/** BLND emissions claimed from a pool's reserves */
export interface V2BlendEmissionsClaimChange extends V2StateChangeBase {
  variant: "BlendEmissionsClaimChange";
  type: "BLEND_EMISSIONS";
  reason: "CLAIM";
  /** BLND SAC contract id; absent only on networks with no known BLND SAC */
  token_id?: string;
  /** BLND claimed, in stroops */
  amount: string;
  /** contract id of the pool whose reserve emissions were claimed */
  pool_id: string;
}

/**
 * Backstop emissions claimed. The BLND is swapped into Comet LP tokens and
 * auto-restaked (the restake emits its own BLEND_BACKSTOP CREDIT rows per
 * pool), so the amount is LP tokens and neither a pool nor a token is
 * attributable to the claim itself.
 */
export interface V2BlendBackstopEmissionsClaimChange extends V2StateChangeBase {
  variant: "BlendBackstopEmissionsClaimChange";
  type: "BLEND_BACKSTOP_EMISSIONS";
  reason: "CLAIM";
  /** Comet BLND:USDC LP tokens minted by the claim */
  amount: string;
}

/** Backstop deposit for one pool, denominated in Comet BLND:USDC LP tokens */
export interface V2BlendBackstopChange extends V2StateChangeBase {
  variant: "BlendBackstopChange";
  type: "BLEND_BACKSTOP";
  reason: "CREDIT" | "DEBIT";
  /** Comet LP tokens deposited or withdrawn */
  amount: string;
  pool_id: string;
}

/**
 * A queue-for-withdrawal entry on the account's backstop position. ADD queues
 * shares for the 17-day lock; REMOVE cancels a queued entry (an executed
 * withdrawal is a BLEND_BACKSTOP DEBIT instead).
 */
export interface V2BlendBackstopQueueChange extends V2StateChangeBase {
  variant: "BlendBackstopQueueChange";
  type: "BLEND_BACKSTOP_QUEUE";
  reason: "ADD" | "REMOVE";
  /** backstop shares queued or dequeued */
  amount: string;
  pool_id: string;
}

/** Discriminated on `variant` — 1:1 with the wallet-backend GraphQL types */
export type V2StateChange =
  | V2BalanceChange
  | V2AccountCreatedChange
  | V2AccountMergedChange
  | V2SignerAddedChange
  | V2SignerUpdatedChange
  | V2SignerRemovedChange
  | V2ThresholdChange
  | V2AccountFlagsChange
  | V2HomeDomainSetChange
  | V2HomeDomainUpdatedChange
  | V2HomeDomainClearedChange
  | V2DataEntryAddedChange
  | V2DataEntryUpdatedChange
  | V2DataEntryRemovedChange
  | V2AllowanceChange
  | V2TrustlineAddedChange
  | V2TrustlineUpdatedChange
  | V2TrustlineRemovedChange
  | V2BalanceAuthorizationChange
  // Blend v2 — not yet served by any deployed backend, see the note above
  | V2BlendSupplyChange
  | V2BlendCollateralChange
  | V2BlendDebtChange
  | V2BlendAuctionChange
  | V2BlendEmissionsClaimChange
  | V2BlendBackstopEmissionsClaimChange
  | V2BlendBackstopChange
  | V2BlendBackstopQueueChange;

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
