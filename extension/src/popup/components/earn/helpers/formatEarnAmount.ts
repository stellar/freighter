import BigNumber from "bignumber.js";

import { formatAmount } from "popup/helpers/formatters";

/**
 * A token amount as the Earn screens show it: grouped, with at least two
 * decimals and every decimal it has beyond that ("500" -> "500.00",
 * "0.0000001" -> "0.0000001"), as on mobile.
 */
export const formatEarnAmount = (amount: string): string => {
  const value = new BigNumber(amount || "0");
  if (value.isNaN()) {
    return amount;
  }
  const decimals = Math.max(2, value.decimalPlaces() ?? 0);
  return formatAmount(value.toFixed(decimals));
};
