import BigNumber from "bignumber.js";

/**
 * The amount a percentage button commits, shared by Send, Swap and the Earn
 * deposit screen — all three host `PercentageButtons` over an available balance.
 *
 * `PercentageButtons` reports whole percents — 25/50/75, and 100 for Max — so
 * the fraction has to be derived here; multiplying by the raw value asks for 25x
 * the balance and every button trips the insufficient-balance check.
 *
 * Rounds DOWN at the asset's precision, so Max lands on the maximum spendable
 * rather than a hair above it.
 */
export const getPercentageAmount = ({
  availableBalance,
  pct,
  decimals,
}: {
  /** Spendable balance, already cleaned of group separators. */
  availableBalance: string;
  pct: number;
  decimals: number;
}) =>
  new BigNumber(availableBalance)
    .multipliedBy(new BigNumber(pct).dividedBy(100))
    .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
    .toFixed();
