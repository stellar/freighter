import BigNumber from "bignumber.js";

import { BASE_RESERVE } from "@shared/constants/stellar";
import { AssetType } from "@shared/api/types/account-balance";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import {
  isClassicBalance,
  isNativeBalance,
  isSorobanBalance,
} from "popup/helpers/balance";

// Pre-flight: does a NEW-token swap risk failing on-chain because the source
// account can't cover the extra 0.5 XLM trustline reserve?
export const shouldShowXlmReservePreflight = ({
  requiresTrustline,
  sourceIsXlm,
  spendableXlm,
}: {
  requiresTrustline: boolean;
  sourceIsXlm: boolean;
  spendableXlm: string;
}): boolean => {
  if (!requiresTrustline) {
    return false;
  }
  const spendable = new BigNumber(spendableXlm);
  const reserve = new BigNumber(BASE_RESERVE);
  if (sourceIsXlm) {
    return spendable.lt(reserve);
  }
  return spendable.lte(reserve);
};

// Swapping XLM → a new token locks BASE_RESERVE (0.5 XLM) for the new
// trustline's subentry, so that XLM is not actually spendable. Reserve it
// up-front by deducting it from the source spendable shown on the amount
// screen (so the percentage buttons + insufficient-balance check exclude it).
// Only when there's at least 0.5 XLM spendable to begin with — below that we
// leave the value untouched and let shouldShowXlmReservePreflight surface the
// shortfall through the XlmReserveSheet instead.
export const deductNewTrustlineReserve = ({
  spendable,
  sourceIsXlm,
  requiresTrustline,
}: {
  spendable: string;
  sourceIsXlm: boolean;
  requiresTrustline: boolean;
}): string => {
  const base = new BigNumber(spendable);
  const reserve = new BigNumber(BASE_RESERVE);
  if (sourceIsXlm && requiresTrustline && base.gte(reserve)) {
    return base.minus(reserve).toFixed();
  }
  return base.toFixed();
};

// Picks the held non-XLM CLASSIC balance with the largest total — the default
// sell token for the "Swap for 0.5 XLM" reserve-recovery affordance on the
// XlmReserveSheet. Returns its canonical ("CODE:ISSUER"), or undefined when
// the account holds no swappable classic token (so the affordance is hidden).
// Sorts by total rather than fiat value — total is what the amount screen
// already has on hand.
export const pickBestNonXlmClassicCanonical = (
  balances: AssetType[],
): string | undefined => {
  const best = balances
    .filter(
      (b) =>
        isClassicBalance(b) &&
        !isNativeBalance(b) &&
        !isSorobanBalance(b) &&
        new BigNumber(b.total).gt(0),
    )
    .sort(
      (a, b) => new BigNumber(b.total).comparedTo(new BigNumber(a.total)) ?? 0,
    )[0];

  if (!best || !isClassicBalance(best)) {
    return undefined;
  }
  return getCanonicalFromAsset(best.token.code, best.token.issuer.key);
};
