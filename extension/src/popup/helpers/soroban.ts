import { BigNumber } from "bignumber.js";

import { TokenBalances } from "@shared/api/types";

export const getTokenBalance = (
  tokenBalances: TokenBalances,
  symbol: string,
) => {
  const balance = tokenBalances.find(
    ({ symbol: tokenSymbol }) => tokenSymbol === symbol,
  );

  const total = balance?.total as BigNumber;

  return total.toString();
};
