import { BigNumber } from "bignumber.js";

export const getMigrationFeeAmount = ({
  recommendedFee,
  trustlineBalancesLength,
  isMergeSelected,
}: {
  recommendedFee: string;

  trustlineBalancesLength: number;
  isMergeSelected: boolean;
}) => {
  /* the number of transaction submissions needs to complete the migration:
 - 1 tx to send the balance. This is always required
 - For trustline balance(s), 1 tx to send them
 - If we're merging, 1 tx to to remove trustlines as well as 1 tx to complete the merge
 */
  const txCount =
    1 + (trustlineBalancesLength || 0) + (isMergeSelected ? 2 : 0);

  return new BigNumber(recommendedFee).times(txCount);
};

export const calculateSenderMinBalance = ({
  minBalance,
  recommendedFee,
  trustlineBalancesLength,
  isMergeSelected,
}: {
  minBalance: string;
  recommendedFee: string;
  trustlineBalancesLength: number;
  isMergeSelected: boolean;
}) =>
  new BigNumber(minBalance).plus(
    getMigrationFeeAmount({
      recommendedFee,
      trustlineBalancesLength,
      isMergeSelected,
    }),
  );
