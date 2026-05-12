import { isContractId } from "popup/helpers/soroban";

/**
 * Returns true when the "destination is unfunded" warning rule applies to
 * this send — i.e. the asset transfers via a classic Stellar payment op
 * AND the destination would be a classic G-account.
 *
 *  - Native XLM, credit_alphanum4/12, and SAC-wrapped classic assets all
 *    use a classic payment op that fails to an unfunded G-account (with
 *    the special case of native ≥ 1 XLM, which succeeds via create-account
 *    — that quantitative check is left to the caller; this helper only
 *    answers the qualitative "should the rule even fire?" question).
 *  - Pure Soroban custom tokens (issuer is a C-address) and collectibles
 *    transfer via contract invocation; the classic destination ledger is
 *    never touched.
 *  - Contract (C...) destinations have no classic account at all — their
 *    "balance" lives in the token contract's storage.
 */
export const shouldCheckUnfundedDestinationWarning = ({
  assetCanonical,
  destination,
  isCollectible,
}: {
  assetCanonical: string;
  destination: string;
  isCollectible: boolean;
}): boolean => {
  if (isCollectible) {
    return false;
  }
  if (destination && isContractId(destination)) {
    return false;
  }

  if (assetCanonical && assetCanonical !== "native") {
    const [, issuer] = assetCanonical.split(":");
    if (issuer && isContractId(issuer)) {
      return false;
    }
  }

  return true;
};

/**
 * Compound predicate used at the SendTo "Search address" screen: returns
 * true only when the destination is known-unfunded (`isFunded === false`,
 * matching the strict semantics in `getExpectedToFailReason`) AND the
 * unfunded-destination warning rule applies to this send.
 *
 * `isFunded` is `boolean | null | undefined` because `AccountBalances.isFunded`
 * is `boolean | null` and the surrounding state may not have loaded balances
 * yet — both null (unknown) and undefined (mid-fetch) must NOT warn.
 */
export const shouldShowAccountDoesntExistWarning = ({
  assetCanonical,
  destination,
  isCollectible,
  isFunded,
}: {
  assetCanonical: string;
  destination: string;
  isCollectible: boolean;
  isFunded: boolean | null | undefined;
}): boolean =>
  isFunded === false &&
  shouldCheckUnfundedDestinationWarning({
    assetCanonical,
    destination,
    isCollectible,
  });
