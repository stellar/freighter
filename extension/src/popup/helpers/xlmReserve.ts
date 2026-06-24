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
