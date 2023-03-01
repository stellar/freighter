import { BigNumber } from "bignumber.js";

import { TokenBalances } from "@shared/api/types";

export const getTokenBalance = (
  tokenBalances: TokenBalances,
  contractId: string,
) => {
  console.log(tokenBalances, contractId);
  const balance = tokenBalances.find(({ contractId: id }) => id === contractId);

  console.log(balance);

  const total = (balance?.total as any) as BigNumber; // TODO

  return total.toString();
};
