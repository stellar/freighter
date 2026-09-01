import BigNumber from "bignumber.js";

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
 *
 * `fee` is the inclusion fee, which is all that is known before simulation, so
 * clearing this bar does not mean the account can pay the whole fee — see
 * `getXlmFeeShortfall` for the post-simulation check that covers the rest.
 */
export const needsXlmForFee = ({
  spendableXlm,
  fee,
}: {
  spendableXlm: string;
  fee: string;
}) => new BigNumber(spendableXlm).lt(new BigNumber(fee));

/**
 * How much XLM a deposit is short of its own network fee, or "0" if it fits.
 *
 * A Blend `submit` is dominated by its resource fee — ~0.0546 XLM against the
 * live pool, roughly 5,000x the inclusion fee — and that figure is only known
 * once simulation returns. Rather than hold a guessed buffer back from the
 * balance (which locks XLM the user may well want to deposit), the deposit
 * screen offers the whole spendable balance and checks the *measured* fee here,
 * after simulation and before the review sheet.
 *
 * `spendableXlm` is expected to come from `getAvailableBalance`, which already
 * nets out the base reserve and the inclusion fee, so only the resource fee is
 * left to cover.
 *
 * The fee is always paid in XLM, so this applies whichever asset is being
 * deposited — only the remainder it comes out of differs. Pass `amount: "0"`
 * for a non-XLM deposit: the XLM balance is untouched, so the whole spendable
 * balance is what the fee has to fit inside. An account can be short either
 * way, and `needsXlmForFee` cannot catch it: that gate runs before simulation,
 * when only the inclusion fee is known.
 */
export const getXlmFeeShortfall = ({
  spendableXlm,
  amount,
  resourceFee,
}: {
  spendableXlm: string;
  /**
   * Cleaned deposit amount — no group separators. "0" when the deposit asset is
   * not XLM, since none of the XLM balance is being spent on the deposit.
   */
  amount: string;
  /** `minResourceFee` from simulation, in XLM. */
  resourceFee: string;
}) => {
  const remaining = new BigNumber(spendableXlm).minus(new BigNumber(amount));
  const shortfall = new BigNumber(resourceFee).minus(remaining);
  return BigNumber.max(shortfall, new BigNumber(0)).toFixed();
};

/**
 * Does a failed simulation read as "this account cannot cover the transfer"?
 *
 * Deliberately narrow: the Stellar Asset Contract's BalanceError (contract error
 * #10) and the classic insufficient-balance result code are the only signals
 * that mean the amount itself is the problem. Everything else — supply caps, a
 * frozen pool, a stale oracle — must keep surfacing the pool's own message.
 */
export const isInsufficientBalanceFailure = (message: string) =>
  /Error\(Contract, #10\)|insufficient[ _]balance/i.test(message);
