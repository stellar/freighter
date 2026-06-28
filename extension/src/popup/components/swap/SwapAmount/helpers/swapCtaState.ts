// Pure CTA state machine for the swap amount screen, mirroring mobile's
// useSwapCtaState. Precedence matters: each guard short-circuits, so the
// label reflects the most specific blocker (§2.4/§2.5).

export type SwapCtaLabelKey =
  | "select"
  | "enter"
  | "insufficientBalance"
  | "insufficientXlmFees"
  | "noQuote"
  | "review";

export interface SwapCtaInputs {
  hasSource: boolean;
  hasDestination: boolean;
  amountIsZero: boolean;
  isAmountTooHigh: boolean;
  insufficientXlmForFees: boolean;
  hasNoSwapPath: boolean;
}

export const getSwapCtaState = ({
  hasSource,
  hasDestination,
  amountIsZero,
  isAmountTooHigh,
  insufficientXlmForFees,
  hasNoSwapPath,
}: SwapCtaInputs): { disabled: boolean; labelKey: SwapCtaLabelKey } => {
  // Enabled so the user can tap it to open the picker for the missing side
  // (the screen prefers the sell token when both are missing). Other blocking
  // states stay disabled — there's nothing useful to do from them.
  if (!hasSource || !hasDestination) {
    return { disabled: false, labelKey: "select" };
  }
  if (amountIsZero) {
    return { disabled: true, labelKey: "enter" };
  }
  if (isAmountTooHigh) {
    return { disabled: true, labelKey: "insufficientBalance" };
  }
  if (insufficientXlmForFees) {
    return { disabled: true, labelKey: "insufficientXlmFees" };
  }
  if (hasNoSwapPath) {
    return { disabled: true, labelKey: "noQuote" };
  }
  return { disabled: false, labelKey: "review" };
};
