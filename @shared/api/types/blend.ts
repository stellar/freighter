/* ────────────────────────────────────────────────────────────────────────────
 * Blend v2 protocol state changes.
 *
 * A protocol extension to the core account-history state-change model in
 * `./backend-api`. Mirrors the upstream `Blend*Change` types, snake_cased by the
 * same convention as the core variants (`poolId` → `pool_id`, required →
 * present, nullable → optional).
 *
 * Blend rows are ADDITIVE: the SEP-41 token-transfer processor emits its own
 * `BalanceChange` for the same movement, so a pool emissions claim reports its
 * amount twice — once as a `BalanceChange` CREDIT and once as a
 * `BlendEmissionsClaimChange`. Never sum amounts across variants. Blend rows
 * also sort after the core rows, since each emitter numbers state changes in its
 * own id namespace.
 *
 * The `BLEND_*` members of `StateChangeCategory` and `StateChangeReason` stay in
 * `./backend-api` — upstream those are each a single enum on the wire, and
 * `V2StateChangeBase` is typed against them.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { V2StateChangeBase } from "./backend-api";

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

/** Discriminated on `variant`, and one arm of the parent `V2StateChange` union */
export type V2BlendStateChange =
  | V2BlendSupplyChange
  | V2BlendCollateralChange
  | V2BlendDebtChange
  | V2BlendAuctionChange
  | V2BlendEmissionsClaimChange
  | V2BlendBackstopEmissionsClaimChange
  | V2BlendBackstopChange
  | V2BlendBackstopQueueChange;
