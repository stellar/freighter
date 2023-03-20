import { BigNumber } from "bignumber.js";

import { TokenBalances } from "@shared/api/types";

export const getTokenBalance = (
  tokenBalances: TokenBalances,
  contractId: string,
) => {
  const balance = tokenBalances.find(({ contractId: id }) => id === contractId);

  const total = (balance?.total as any) as BigNumber; // TODO

  return total.toString();
};
