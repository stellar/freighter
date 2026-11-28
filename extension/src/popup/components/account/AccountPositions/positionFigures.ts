import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
import {
  formatAccountUsd,
  formatRatePercent,
} from "popup/components/earn/helpers/formatPoolStats";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";

/**
 * A token amount with its code, "1,218.6488 USDC", or "--" when the amount is
 * unknown (a Soroban-only token whose decimals the backend didn't report).
 */
export const formatPositionTokens = (tokens: string | null, code: string) =>
  tokens === null ? NO_FIAT_VALUE : `${formatEarnAmount(tokens)} ${code}`;

/**
 * A position's gain: "+$31.75 (2.54%)", the interest in dollars, truncated to
 * cents like every account figure, and its share of principal. The Figma
 * frames drop the "$"; the screens keep it.
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

  const sign = interestUsd < 0 ? "-" : "+";
  const amount = formatAccountUsd(Math.abs(interestUsd));

  return gainPercent === null
    ? `${sign}${amount}`
    : `${sign}${amount} (${formatRatePercent(Math.abs(gainPercent))}%)`;
};

/**
 * The modifier class a gain figure takes: grey when unknown ("--"), grey when
 * it is a loss, so a negative figure never reads as a green gain, and none
 * (green) otherwise. `value` is the figure's sign source: the interest, or
 * the gain share for the card's badge.
 */
export const getGainModifier = (
  block: string,
  value: number | null,
): string => {
  if (value === null) {
    return ` ${block}--unknown`;
  }
  return value < 0 ? ` ${block}--loss` : "";
};

/** The pool card's gain badge: "+2.54%". Null when the share is unknown. */
export const formatGainBadge = (gainPercent: number | null): string | null =>
  gainPercent === null
    ? null
    : `${gainPercent < 0 ? "-" : "+"}${formatRatePercent(Math.abs(gainPercent))}%`;
