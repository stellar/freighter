import { BlendCatalogPool } from "@shared/api/types/blend";

/**
 * The Blend v2 statuses that stop deposits: frozen by the pool's admin (4),
 * frozen because its backstop is draining (5), and still being set up (6).
 * On ice (2, 3) stops only borrowing. Withdrawals and repayments stay open in
 * every status (pool `require_action_allowed`).
 *
 * Blend's own app calls all three "frozen", and so does Earn. Setup should not
 * reach a user in practice, since Earn only lists pools already set up.
 */
const FROZEN_STATUSES = new Set(["ADMIN_FROZEN", "FROZEN", "SETUP"]);

/**
 * Whether the pool is known to be frozen, taking no deposits.
 *
 * A pool with no status yet (null until the indexer has its config) or no
 * catalog entry at all is unknown rather than frozen, and reads as false: the
 * banner says something definite, so it waits for a definite status.
 */
export const isPoolFrozen = (
  pool: BlendCatalogPool | null | undefined,
): boolean => FROZEN_STATUSES.has(pool?.status ?? "");
