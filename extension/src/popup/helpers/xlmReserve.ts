import BigNumber from "bignumber.js";

import { BASE_RESERVE } from "@shared/constants/stellar";

// Pre-flight: does a NEW-token swap risk failing on-chain because the source
// account can't cover the extra 0.5 XLM trustline reserve? §3.6.
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
// shortfall through the XlmReserveSheet instead. Mirrors mobile's
// SwapAmountScreen spendable deduction (§2.2).
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
