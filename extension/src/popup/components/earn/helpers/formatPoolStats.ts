import BigNumber from "bignumber.js";

import { NO_FIAT_VALUE, formatAmount, roundUsdValue } from "popup/helpers/formatters";

/**
 * Account-scale USD — "$1,500.00", never compact. `formatCompactUsd` below is
 * for pool-scale figures and goes compact at $1,000, which drops the cents
 * from a personal balance ("$1.50K" for a $1,500 position). This is the
 * single rounding rule for account-scale money: truncates via `roundUsdValue`
 * rather than the half-up rounding `toFormat` uses, so a row and a sheet
 * showing the same balance can never disagree (I1).
 *
 * Returns NO_FIAT_VALUE for null — no fresh price for this account's token, not a
 * real zero.
 */
export const formatAccountUsd = (value: number | null): string =>
  value === null ? NO_FIAT_VALUE : `$${formatAmount(roundUsdValue(String(value)))}`;

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
