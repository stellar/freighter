import BigNumber from "bignumber.js";

import { AssetType, ClassicAsset } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { isMainnet } from "helpers/stellar";
import { EARN_ONRAMP_ASSETS, NotEnoughVariant } from "popup/constants/earn";
import {
  isClassicBalance,
  isNativeBalance,
  isSorobanBalance,
} from "popup/helpers/balance";

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
 * Does the account hold anything it could swap into the target asset?
 *
 * Swap is classic-only — it builds a Horizon `pathPaymentStrictSend` and
 * rejects contract-ID assets outright — so a Soroban-only balance is not a
 * viable source. Native XLM counts: it is the most common source of all.
 *
 * `targetCanonical` is excluded so a dust balance of the target itself never
 * makes the account look like it can swap into what it already has.
 */
export const hasSwappableBalance = (
  balances: AssetType[],
  targetCanonical: string,
) =>
  balances.some((balance) => {
    // Contract-only tokens are not swappable, and LP shares are not a token.
    // Note isClassicBalance keys off `issuer`, which native XLM has not — so
    // it has to be admitted explicitly or the most common source is excluded.
    if (isSorobanBalance(balance)) {
      return false;
    }
    const isNative = isNativeBalance(balance);
    if (!isNative && !isClassicBalance(balance)) {
      return false;
    }
    if (!new BigNumber(balance.total).gt(0)) {
      return false;
    }

    const canonical = isNative
      ? "native"
      : getCanonicalFromAsset(
          (balance as ClassicAsset).token.code,
          (balance as ClassicAsset).token.issuer.key,
        );

    return canonical !== targetCanonical;
  });

/**
 * Picks which button set the "Not enough X" sheet shows.
 *
 * `TRANSFER_ONLY` is absent from the designs but is genuinely reachable — an
 * empty account on a non-onrampable asset has nothing to buy with and nothing
 * to swap from. Falling through to a sheet with no actions would be worse than
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
