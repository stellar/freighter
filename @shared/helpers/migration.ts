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
  /* the number of operations needs to complete the migration:
 - 1 op to send the balance. This is always required
 - For trustline balance(s), 1 op each to send them
 - If we're merging, 1 op each to remove trustlines
 - Plus one more tx to merge
 */
  const opCount =
    1 +
    (trustlineBalancesLength * (isMergeSelected ? 2 : 1) || 0) +
    (isMergeSelected ? 1 : 0);

  return new BigNumber(recommendedFee).times(opCount);
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
