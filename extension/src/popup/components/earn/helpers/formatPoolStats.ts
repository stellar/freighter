import BigNumber from "bignumber.js";

import { NO_FIAT_VALUE, formatAmount } from "popup/helpers/formatters";

/**
 * Account-scale USD — "$1,500.00", never compact. `formatCompactUsd` below is
 * for pool-scale figures and goes compact at $1,000, which drops the cents
 * from a personal balance ("$1.50K" for a $1,500 position). This is the
 * single rounding rule for account-scale money: truncates rather than rounds,
 * so a row and a sheet showing the same balance can never disagree.
 *
 * Truncation happens via `BigNumber#decimalPlaces` rather than the
 * app-wide `roundUsdValue`, which floors by multiplying the value by 100 as
 * a JS float — binary float error makes `1.15 * 100 === 114.99999999999999`,
 * so it floors an exact `1.15` to `1.14`. `BigNumber` truncates the decimal
 * string directly, so it never mis-floors an exact-cent value.
 *
 * Returns NO_FIAT_VALUE for null — no fresh price for this account's token, not a
 * real zero.
 */
export const formatAccountUsd = (value: number | null): string =>
  value === null
    ? NO_FIAT_VALUE
    : `$${formatAmount(
        new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed(2),
      )}`;

/**
 * Compact USD for pool-scale figures — "$50.05M" rather than "$50,050,000".
 *
 * Returns "--" for null, which means the pool oracle has no fresh price. That
 * is distinct from a real zero, which formats as "$0.00".
 */
export const formatCompactUsd = (value: number | null): string => {
  if (value === null) {
    return NO_FIAT_VALUE;
  }

  const amount = new BigNumber(value);
  const abs = amount.abs();

  const units: [BigNumber, string][] = [
    [new BigNumber(1e9), "B"],
    [new BigNumber(1e6), "M"],
    [new BigNumber(1e3), "K"],
  ];

  const unit = units.find(([threshold]) => abs.gte(threshold));
  if (!unit) {
    return `$${amount.toFormat(2)}`;
  }

  const [divisor, suffix] = unit;
  return `$${amount.dividedBy(divisor).toFormat(2)}${suffix}`;
};

/**
 * A rate as a percentage — 0.1694 becomes "16.94%".
 *
 * Null means no fresh oracle price and renders "--"; a genuine zero renders
 * "0.00%". Never conflate the two.
 */
export const formatRate = (rate: number | null): string =>
  rate === null
    ? NO_FIAT_VALUE
    : `${new BigNumber(rate).times(100).toFormat(2)}%`;

/**
 * The headline rate is supply interest plus BLND emissions. This is the
 * branch's ONE deliberate exception to "null is not zero" (see the other
 * helpers on this file, and every call site's own comment): a null `rate`
 * means no fresh oracle price, so the whole rate is unknown and stays null.
 * A null `emissions` means the stream exists but cannot be priced — treated
 * as zero, which understates rather than blanks an otherwise known rate.
 *
 * One implementation so that a future decision to blank the rate on null
 * emissions instead cannot silently miss a call site (I5).
 */
export const headlineApy = (
  rate: number | null,
  emissions: number | null,
): number | null => (rate === null ? null : rate + (emissions ?? 0));
