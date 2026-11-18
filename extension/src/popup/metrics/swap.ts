import { SwapSource } from "popup/constants/swap";

/**
 * Where the swap was opened from, as every swap event carries it: `source` is
 * "home", "token_details" or "earn". Both hosts always set one (the Swap route
 * defaults to "home"), so the property is left off only for a swap event that
 * no host started.
 */
export const swapSourceProps = (
  swapSource: SwapSource | null | undefined,
): { source?: SwapSource } => (swapSource ? { source: swapSource } : {});
