import { BigNumber } from "bignumber.js";

export const calculateSenderMinBalance = ({
  minBalance,
  recommendedFee,
  opCount,
}: {
  minBalance: string;
  recommendedFee: string;
  opCount: number;
}) =>
  new BigNumber(minBalance).plus(new BigNumber(recommendedFee).times(opCount));
