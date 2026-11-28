import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import { isNativeBalance } from "@shared/helpers/assetIdentity";
import {
  getBalanceCanonicalKey,
  isClassicBalance,
  isSorobanBalance,
} from "popup/helpers/balance";

/**
 * Could the Earn swap sell this balance to get `targetCanonical`?
 *
 * Swap builds a classic path payment and rejects contract tokens, so only
 * native XLM and classic assets qualify (an LP share is not a token), never
 * the target itself, and only with something to sell. Note isClassicBalance
 * keys off `issuer`, which native XLM has not, so XLM is admitted explicitly.
 */
export const isSwapSourceCandidate = (
  balance: AssetType,
  targetCanonical: string,
) =>
  !isSorobanBalance(balance) &&
  (isNativeBalance(balance) || isClassicBalance(balance)) &&
  new BigNumber(balance.total).gt(0) &&
  getBalanceCanonicalKey(balance) !== targetCanonical;
