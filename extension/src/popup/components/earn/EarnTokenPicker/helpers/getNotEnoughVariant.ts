import BigNumber from "bignumber.js";

import { AssetType, ClassicAsset } from "@shared/api/types/account-balance";
import { BASE_RESERVE, NetworkDetails } from "@shared/constants/stellar";
import { isNativeBalance } from "@shared/helpers/assetIdentity";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { isMainnet } from "helpers/stellar";
import { EARN_ONRAMP_ASSETS, NotEnoughVariant } from "popup/constants/earn";
import { isClassicBalance, isSorobanBalance } from "popup/helpers/balance";
import { getAvailableBalance } from "popup/helpers/soroban";

/**
 * Can the Coinbase onramp sell this asset?
 *
 * `useGetOnrampToken` builds `pay.coinbase.com/buy/select-asset?…&defaultAsset=`
 * from the bare code, so an asset Coinbase does not list produces a dead-end
 * page rather than an error — hence the curated allowlist rather than offering
 * Buy for everything. Testnet assets are worthless, so the onramp is mainnet-only.
 */
export const isOnrampableAsset = (
  code: string,
  networkDetails: NetworkDetails,
) => EARN_ONRAMP_ASSETS.has(code) && isMainnet(networkDetails);

/**
 * Does the account hold anything it could actually swap into the target?
 *
 * Only what is spendable counts, as on main Swap (`getAvailableBalance`): XLM
 * above the account's minimum balance and the swap's fee, and other classic
 * assets' balance. A target the account has no trustline for needs one opened
 * first, which locks another BASE_RESERVE of XLM whichever token is swapped,
 * so that target also needs more XLM headroom than the reserve — the line main
 * Swap draws before it shows its reserve sheet (`shouldShowXlmReservePreflight`).
 *
 * Swap is classic-only — it builds a Horizon `pathPaymentStrictSend` and
 * rejects contract-ID assets outright — so a Soroban-only balance is not a
 * viable source. Native XLM counts: it is the most common source of all.
 */
export const hasSwappableBalance = ({
  balances,
  targetCanonical,
  transactionFee,
  requiresTrustline,
}: {
  balances: AssetType[];
  /**
   * Excluded so a dust balance of the target itself never makes the account
   * look like it can swap into what it already has. Empty when unknown.
   */
  targetCanonical: string;
  /** The swap's total fee, in XLM. */
  transactionFee: string;
  /** Whether the swap has to open a trustline for the target first. */
  requiresTrustline: boolean;
}) => {
  const spendableXlm = new BigNumber(
    getAvailableBalance({
      assetCanonical: "native",
      balances,
      recommendedFee: transactionFee,
    }),
  );
  if (requiresTrustline && spendableXlm.lte(BASE_RESERVE)) {
    return false;
  }
  const xlmLeftToSwap = requiresTrustline
    ? spendableXlm.minus(BASE_RESERVE)
    : spendableXlm;

  return balances.some((balance) => {
    // Contract-only tokens are not swappable, and LP shares are not a token.
    // Note isClassicBalance keys off `issuer`, which native XLM has not — so
    // it has to be admitted explicitly or the most common source is excluded.
    if (isSorobanBalance(balance)) {
      return false;
    }
    if (isNativeBalance(balance)) {
      return xlmLeftToSwap.gt(0);
    }
    if (!isClassicBalance(balance)) {
      return false;
    }

    const canonical = getCanonicalFromAsset(
      (balance as ClassicAsset).token.code,
      (balance as ClassicAsset).token.issuer.key,
    );

    return canonical !== targetCanonical && new BigNumber(balance.total).gt(0);
  });
};

/**
 * Picks which button set the "Not enough X" sheet shows.
 *
 * `TRANSFER_ONLY` is what an account gets with nothing to buy with and nothing
 * to swap from: falling through to a sheet with no actions would be worse than
 * offering the one thing that always works.
 */
export const getNotEnoughVariant = ({
  isOnrampable,
  isSwappable,
}: {
  isOnrampable: boolean;
  isSwappable: boolean;
}): NotEnoughVariant => {
  if (isOnrampable && isSwappable) {
    return NotEnoughVariant.BUY_SWAP_OR_TRANSFER;
  }
  if (isOnrampable) {
    return NotEnoughVariant.BUY_OR_TRANSFER;
  }
  if (isSwappable) {
    return NotEnoughVariant.SWAP_OR_TRANSFER;
  }
  return NotEnoughVariant.TRANSFER_ONLY;
};
