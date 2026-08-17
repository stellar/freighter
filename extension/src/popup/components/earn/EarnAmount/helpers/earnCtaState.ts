import BigNumber from "bignumber.js";

import { BLEND_DEPOSIT_XLM_FEE_BUFFER } from "@shared/constants/blend";

/**
 * Pure CTA state machine for the deposit amount screen. Precedence matters:
 * each guard short-circuits, so the label reflects the most specific blocker.
 */
export type EarnCtaLabelKey = "enter" | "insufficient" | "review";

export interface EarnCtaInputs {
  /** Spendable balance of the deposit asset, net of reserve and fee. */
  availableBalanceIsZero: boolean;
  amountIsZero: boolean;
  isAmountTooHigh: boolean;
}

export const getEarnCtaState = ({
  availableBalanceIsZero,
  amountIsZero,
  isAmountTooHigh,
}: EarnCtaInputs): { disabled: boolean; labelKey: EarnCtaLabelKey } => {
  // Nothing enterable is valid with zero spendable balance, so surface the
  // blocker directly rather than inviting an amount that cannot work.
  if (availableBalanceIsZero) {
    return { disabled: true, labelKey: "insufficient" };
  }
  if (amountIsZero) {
    return { disabled: true, labelKey: "enter" };
  }
  if (isAmountTooHigh) {
    return { disabled: true, labelKey: "insufficient" };
  }
  return { disabled: false, labelKey: "review" };
};

/**
 * Does the account lack the XLM to pay this transaction's fee?
 *
 * A Soroban invoke's fee is XLM-only and no trustline is involved, so this is
 * simply "spendable XLM < fee". `spendableXlm` is expected to come from
 * `getAvailableBalance`, which already nets out the base reserve.
 *
 * Order this AFTER the CTA's insufficient-funds check: when the deposit asset
 * IS XLM, an unaffordable amount should read as insufficient funds on the
 * button, and this sheet should only fire for an otherwise-affordable amount
 * that leaves no fee headroom.
 */
export const needsXlmForFee = ({
  spendableXlm,
  fee,
}: {
  spendableXlm: string;
  fee: string;
}) => new BigNumber(spendableXlm).lt(new BigNumber(fee));

/**
 * Spendable amount to offer for a Max deposit.
 *
 * `getAvailableBalance` subtracts the base reserve and the *inclusion* fee, but
 * a Blend `submit` is dominated by its resource fee — measured at ~0.0546 XLM
 * against the live pool, roughly 5,000x the inclusion fee. Depositing the raw
 * available balance of XLM therefore simulates into an insufficient-balance
 * error. Hold back a buffer; Review re-checks against the real `minResourceFee`
 * once simulation returns.
 *
 * Only XLM needs this — for any other asset the fee is paid from a separate
 * balance, and the shortfall surfaces through the network-fee sheet instead.
 */
export const getMaxDepositAmount = ({
  availableBalance,
  isXlm,
}: {
  availableBalance: string;
  isXlm: boolean;
}) => {
  const available = new BigNumber(availableBalance);
  if (!isXlm) {
    return available.toFixed();
  }
  return BigNumber.max(
    available.minus(new BigNumber(BLEND_DEPOSIT_XLM_FEE_BUFFER)),
    new BigNumber(0),
  ).toFixed();
};
