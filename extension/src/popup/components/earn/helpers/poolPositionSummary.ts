import BigNumber from "bignumber.js";

import { PoolPosition } from "@shared/api/types/blend";

export interface PoolPositionSummary {
  /** The pool's total value to this account. Null when unpriced. */
  totalUsd: number | null;
  /**
   * Lifetime interest across every supplied asset. Null if ANY row is unpriced
   * — a partial sum would understate the figure while looking authoritative.
   */
  interestUsd: number | null;
  /** Interest as a fraction of principal (0.0254 = 2.54%). Null when underivable. */
  gainPercent: number | null;
  /** The account's supplied-USD-weighted rate in this pool. */
  apy: number | null;
}

/**
 * The pool-level figures behind a Positions pool card and the My position
 * header.
 *
 * Deliberately separate from `getPositionSummary`, which is supply-scoped and
 * answers a different question (what one asset is doing). Keeping them apart
 * is what lets each own its totals explicitly instead of sharing a mode flag.
 *
 * The gain is measured against PRINCIPAL, not the current total: an account
 * that put in 1252.57 and now holds 1284.32 has gained 2.54% of what it
 * committed, not 2.47% of what it now has. Same convention the sheet already
 * uses for deposits.
 */
export const getPoolPositionSummary = (
  position: PoolPosition,
): PoolPositionSummary => {
  const supply = position.blend?.supply || [];
  const totalUsd = position.netUsd ?? null;

  // A position with no detail at all has UNKNOWN interest, not zero — the
  // difference `[].reduce(…, 0)` would silently erase. A position whose detail
  // is present but empty genuinely has none, so that case really is 0.
  //
  // Within a populated list, one unpriced row makes the whole total unknown:
  // reduced with a null-poison rather than filtered, so a partial sum can never
  // masquerade as complete.
  const interestUsd = !position.blend
    ? null
    : supply.reduce<number | null>((sum, row) => {
        if (sum === null || row.interestEarnedUsd === null) {
          return null;
        }
        return sum + row.interestEarnedUsd;
      }, 0);

  const gainPercent = (() => {
    if (totalUsd === null || interestUsd === null) {
      return null;
    }
    const principal = new BigNumber(totalUsd).minus(interestUsd);
    // A position that is entirely accrued interest has no principal to measure
    // against; the ratio is undefined, not infinite.
    if (principal.lte(0)) {
      return null;
    }
    return new BigNumber(interestUsd).dividedBy(principal).toNumber();
  })();

  return {
    totalUsd,
    interestUsd,
    gainPercent,
    apy: position.netApy ?? null,
  };
};
