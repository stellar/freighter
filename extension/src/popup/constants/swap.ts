export enum STEPS {
  AMOUNT = "set-swap-amount",
  CONFIRM_AMOUNT = "confirm-amount",
  SET_FROM_ASSET = "set-from-asset",
  SET_DST_ASSET = "set-dst-asset",

  CHOOSE_ASSETS = "choose-swap-assets",
  SWAP_SETTINGS = "set-swap-settings",
  SET_SWAP_FEE = "set-swap-fee",
  SET_SWAP_SLIPPAGE = "set-swap-slippage",
  SET_SWAP_TIMEOUT = "set-swap-timeout",
  SWAP_CONFIRM = "swap-confirmation",
}

/**
 * Where the swap was opened from, carried as `source` on the swap events (see
 * popup/metrics/swap.ts). Absent for Home's Swap tab.
 */
export enum SwapSource {
  /** The AssetDetail view's Swap button. */
  TokenDetails = "token_details",
  /** The swap sheet inside Earn, opened from the not-enough sheet. */
  Earn = "earn",
}

/**
 * The sources the Swap route takes from its `?source=` query param. A closed
 * set, so arbitrary URL values never reach analytics. Earn's swap is not among
 * them: it opens as a sheet inside Earn, never through the route.
 */
const ROUTE_SWAP_SOURCES: string[] = [SwapSource.TokenDetails];

export const isSwapSource = (value: string | null): value is SwapSource =>
  value !== null && ROUTE_SWAP_SOURCES.includes(value);
