import { SwapSource } from "popup/constants/swap";

/**
 * Where the swap was opened from, as every swap event carries it: `source` is
 * "token_details" or "earn", and absent for Home's Swap tab, matching what
 * `swap.completed` has always sent on both clients.
 */
export const swapSourceProps = (
  swapSource: SwapSource | null | undefined,
): { source?: SwapSource } => (swapSource ? { source: swapSource } : {});
