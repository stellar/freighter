import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { isNativeBalance } from "@shared/helpers/assetIdentity";
import { isMainnet } from "helpers/stellar";
import { EARN_ONRAMP_ASSETS, NotEnoughVariant } from "popup/constants/earn";
import { isSwapSourceCandidate } from "popup/components/earn/helpers/isSwapSourceCandidate";
import { getAvailableBalance } from "popup/helpers/soroban";
import {
  deductNewTrustlineReserve,
  shouldShowXlmReservePreflight,
} from "popup/helpers/xlmReserve";

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
 * assets' balance. The fee is paid in XLM whatever is swapped, so without the
 * XLM to pay it nothing counts. A target the account has no trustline for
 * needs one opened first, which locks another BASE_RESERVE of XLM whichever
 * token is swapped, so that target also needs more XLM headroom than the
 * reserve — the line main Swap draws before it shows its reserve sheet
 * (`shouldShowXlmReservePreflight`).
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
  // Whatever is swapped, the swap's fee is paid in XLM, so nothing is
  // swappable without the XLM above the minimum balance to pay it. XLM held
  // only as that reserve can't even pay for a swap into more XLM.
  const xlmAboveReserve = getAvailableBalance({
    assetCanonical: "native",
    balances,
    recommendedFee: "0",
  });
  if (new BigNumber(xlmAboveReserve).lt(transactionFee)) {
    return false;
  }
  const spendableXlm = getAvailableBalance({
    assetCanonical: "native",
    balances,
    recommendedFee: transactionFee,
  });
  // Main Swap's gate for a token sold into a new trustline. Taken as a
  // non-XLM sale because the reserve is needed whichever token is sold.
  if (
    shouldShowXlmReservePreflight({
      requiresTrustline,
      sourceIsXlm: false,
      spendableXlm,
    })
  ) {
    return false;
  }
  // Selling XLM itself: what is left once the new trustline's reserve is set
  // aside.
  const xlmLeftToSwap = new BigNumber(
    deductNewTrustlineReserve({
      spendable: spendableXlm,
      sourceIsXlm: true,
      requiresTrustline,
    }),
  );

  return balances.some(
    (balance) =>
      isSwapSourceCandidate(balance, targetCanonical) &&
      (!isNativeBalance(balance) || xlmLeftToSwap.gt(0)),
  );
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
