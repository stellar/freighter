import { BlendCatalogPool } from "@shared/api/types/blend";

/**
 * The Blend v2 statuses that stop deposits: frozen by the pool's admin (4),
 * frozen because its backstop is draining (5), and still being set up (6).
 * On ice (2, 3) stops only borrowing. Withdrawals and repayments stay open in
 * every status (pool `require_action_allowed`).
 */
const PAUSES_DEPOSITS = new Set(["ADMIN_FROZEN", "FROZEN", "SETUP"]);

/**
 * Whether the pool is known to be taking no deposits. Blend's own app treats
 * these statuses as one "frozen" state, and so does Earn.
 *
 * A pool with no status yet (null until the indexer has its config) or no
 * catalog entry at all is unknown rather than paused, and reads as false:
 * the banner says something definite, so it waits for a definite status.
 */
export const isPoolDepositPaused = (
  pool: BlendCatalogPool | null | undefined,
): boolean => PAUSES_DEPOSITS.has(pool?.status ?? "");
