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
 * `source` on `swap.completed`. Closed set: `Swap` validates the `?source=`
 * query param against it so arbitrary URL values never reach analytics.
 */
export enum SwapSource {
  /** The AssetDetail view's Swap button. */
  TokenDetails = "token_details",
}

export const isSwapSource = (value: string | null): value is SwapSource =>
  value !== null && (Object.values(SwapSource) as string[]).includes(value);
