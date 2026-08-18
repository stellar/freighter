import BigNumber from "bignumber.js";

/**
 * The amount a percentage button on the deposit screen commits.
 *
 * `PercentageButtons` reports whole percents — 25/50/75, and 100 for Max — so
 * the fraction has to be derived here; multiplying by the raw value asks for 25x
 * the balance and every button trips the insufficient-balance check.
 *
 * Rounds DOWN at the asset's precision, so Max lands on the maximum spendable
 * rather than a hair above it.
 */
export const getPercentageDepositAmount = ({
  maxDepositable,
  pct,
  decimals,
}: {
  maxDepositable: string;
  pct: number;
  decimals: number;
}) =>
  new BigNumber(maxDepositable)
    .multipliedBy(new BigNumber(pct).dividedBy(100))
    .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
    .toFixed();
