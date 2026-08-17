import BigNumber from "bignumber.js";

/**
 * Projected earnings on a deposit, in USD.
 *
 * Deliberately simple interest on the deposit's current USD value: the rate is
 * a live figure that moves with pool utilization, so compounding it would imply
 * a precision the estimate does not have. The screen labels these "(est.)" and
 * the APY disclaimer carries the caveat.
 *
 * Returns null when either input is unavailable — a missing rate or an unpriced
 * asset means "unknown", not "zero". Callers render null as "--".
 */
export const projectEarnings = ({
  depositUsd,
  apy,
}: {
  /** USD value of the deposit; null when the asset has no fresh price. */
  depositUsd: string | null;
  /** Rate as a decimal fraction (0.1694 = 16.94%); null when unavailable. */
  apy: number | null;
}): { monthly: string | null; yearly: string | null } => {
  if (depositUsd === null || apy === null) {
    return { monthly: null, yearly: null };
  }

  const yearly = new BigNumber(depositUsd).multipliedBy(apy);

  return {
    yearly: yearly.toFixed(2),
    // A twelfth of the annual figure, not a compounded monthly rate — see above.
    monthly: yearly.dividedBy(12).toFixed(2),
  };
};

/** Formats a projected figure for display, rendering an unknown value as "--". */
export const formatProjection = (value: string | null) =>
  value === null ? "--" : `$${new BigNumber(value).toFormat(2)}`;
