import BigNumber from "bignumber.js";

import { ApiTokenPrices } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";
import { isNativeBalance } from "@shared/helpers/assetIdentity";
import {
  getBalanceCanonicalKey,
  isClassicBalance,
  isSorobanBalance,
} from "popup/helpers/balance";

/**
 * The token the Earn swap starts from, chosen as mobile chooses it: the most
 * valuable balance that has a price, else XLM, else the first one there is.
 *
 * Only classic balances other than the target, and only non-empty ones, are
 * candidates: Swap builds a classic path payment and rejects contract tokens.
 * Prices come from the cache, so a balance with no cached price counts as
 * unpriced. Returns a canonical, "native" when nothing qualifies.
 */
export const pickSwapSource = ({
  balances,
  prices,
  destinationCanonical,
}: {
  balances: AssetType[];
  prices: ApiTokenPrices | null | undefined;
  destinationCanonical: string;
}): string => {
  const candidates = balances.filter(
    (balance) =>
      !isSorobanBalance(balance) &&
      (isNativeBalance(balance) || isClassicBalance(balance)) &&
      new BigNumber(balance.total).gt(0) &&
      getBalanceCanonicalKey(balance) !== destinationCanonical,
  );

  let mostValuable: AssetType | undefined;
  let highestValue = new BigNumber(0);
  candidates.forEach((balance) => {
    const price = prices?.[getBalanceCanonicalKey(balance)]?.currentPrice;
    if (!price) {
      return;
    }
    const value = new BigNumber(price).multipliedBy(balance.total);
    // Strictly greater, so a tie keeps the balance listed first.
    if (value.gt(highestValue)) {
      mostValuable = balance;
      highestValue = value;
    }
  });

  const source =
    mostValuable ?? candidates.find(isNativeBalance) ?? candidates[0];
  return source ? getBalanceCanonicalKey(source) : "native";
};
