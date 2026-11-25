import BigNumber from "bignumber.js";

import { formatRatePercent } from "popup/components/earn/helpers/formatPoolStats";

/**
 * A position's gain as the Varial screens draw it: "+31.75 (2.54%)" — the
 * interest in dollars, truncated to cents like every account figure, and its
 * share of principal. The design writes the dollar figure without a "$".
 *
 * Null when the interest is unknown. A known interest with no measurable
 * share (no principal left) keeps the amount and drops the percentage.
 */
export const formatPositionGain = (
  interestUsd: number | null,
  gainPercent: number | null,
): string | null => {
  if (interestUsd === null) {
    return null;
  }

  const interest = new BigNumber(interestUsd);
  const sign = interest.isNegative() ? "-" : "+";
  const amount = interest
    .abs()
    .decimalPlaces(2, BigNumber.ROUND_DOWN)
    .toFormat(2);

  return gainPercent === null
    ? `${sign}${amount}`
    : `${sign}${amount} (${formatRatePercent(Math.abs(gainPercent))}%)`;
};

/** The pool card's gain badge: "+2.54%". Null when the share is unknown. */
export const formatGainBadge = (gainPercent: number | null): string | null =>
  gainPercent === null
    ? null
    : `${gainPercent < 0 ? "-" : "+"}${formatRatePercent(Math.abs(gainPercent))}%`;
