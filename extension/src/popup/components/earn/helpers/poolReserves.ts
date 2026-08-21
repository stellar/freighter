import { BlendCatalogPool, BlendCatalogReserve } from "@shared/api/types/blend";

/**
 * A pool's reserves that can actually take a deposit.
 *
 * Blend's `require_action_allowed` panics with `ReserveDisabled` on Supply,
 * SupplyCollateral, and Borrow into a reserve whose config has `enabled: false`
 * — only Withdraw and Repay stay open — so a disabled reserve is not an
 * accepted token however the catalog reports it.
 *
 * The pools catalog reports every reserve with its flag and leaves the decision
 * here, while the backend's earn-options derivation drops disabled reserves
 * before the token picker ever sees them. Filtering with the same predicate is
 * what keeps the two lists from contradicting each other on the same screen.
 */
export const getAcceptedReserves = (
  pool: BlendCatalogPool | null,
): BlendCatalogReserve[] =>
  (pool?.reserves || []).filter((reserve) => reserve.enabled);
