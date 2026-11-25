import { STEPS, SwapSource } from "popup/constants/swap";
import { ScreenByStep } from "popup/helpers/useStepScreenViews";

/**
 * Where the swap was opened from, as every swap event carries it: `source` is
 * "home", "token_details" or "earn". Both hosts always set one (the Swap route
 * defaults to "home"), so the property is left off only for a swap event that
 * no host started.
 */
export const swapSourceProps = (
  swapSource: SwapSource | null | undefined,
): { source?: SwapSource } => (swapSource ? { source: swapSource } : {});

/**
 * The swap's screen view per step, on the Swap route and in Earn's swap
 * sheet alike; the step's identity lives in `screen_name`.
 *
 * STEPS.SWAP_CONFIRM is deliberately absent. It renders the submitting screen,
 * which the user only reaches after approving, so it is not the `confirm`
 * stage: SwapAmount's review modal is, and it emits `swap_confirm` itself. The
 * submitting screen's own stages (processing, then success) are reported by
 * useSwapSubmitScreenViews.
 */
export const SWAP_SCREEN_BY_STEP: ScreenByStep<STEPS> = {
  [STEPS.SET_DST_ASSET]: { screen_name: "swap_to_asset", flow: "swap" },
  [STEPS.AMOUNT]: { screen_name: "swap_amount", flow: "swap" },
  [STEPS.CONFIRM_AMOUNT]: { screen_name: "swap_amount_review", flow: "swap" },
  [STEPS.SET_FROM_ASSET]: { screen_name: "swap_from_asset", flow: "swap" },
};
