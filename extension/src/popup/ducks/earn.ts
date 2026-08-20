import { createSlice } from "@reduxjs/toolkit";

import { BlendCatalogPool } from "@shared/api/types/blend";

/**
 * Earn-domain state that has no home in `transactionSubmission`.
 *
 * The deposit's transaction-shaped state (asset, amount, destination, fee,
 * simulation, submit status) deliberately lives in `transactionSubmission`
 * instead: every terminal component the flow reuses — TransactionConfirm,
 * SendingTransaction, SubmitFail, ReviewTx — reads that slice directly, and the
 * swap branch *is* the Swap components, so it has to use it regardless.
 *
 * What lands here is what must survive `resetSubmission()` or has no equivalent
 * field there.
 */
export interface EarnState {
  /** Catalog entry for the allowlisted pool; null until the fetch resolves. */
  pool: BlendCatalogPool | null;
  /**
   * The chosen asset's contract address (its SAC). Captured at pick time rather
   * than re-derived from the canonical later: the pool addresses reserves by
   * contract id, and the deposit's Request carries that address, not the code.
   */
  selectedAssetId: string;
  /**
   * The chosen asset's headline rate (supply APY + emissions APR) as a decimal
   * fraction, or null when the oracle has no fresh price. Carried from the token
   * picker so the amount ribbon and review row don't re-derive it.
   */
  selectedAssetApy: number | null;
  /**
   * The account's existing balance in the pool for the chosen asset, in raw
   * token units — the "before" side of Review's `0.00 -> 500.00`. Defaults to
   * "0", which is also what a fetch failure falls back to.
   */
  currentPositionTokens: string;
  /** null until the background flag has been read; avoids flashing the intro. */
  hasSeenIntro: boolean | null;
  /**
   * Drives the "Transaction failed. Try again." banner on the amount screen.
   *
   * Lives here rather than in component state because it is set while
   * DEPOSIT_CONFIRM is active and read after the flow has stepped back to
   * AMOUNT — component state would be torn down in between.
   */
  lastSubmitFailed: boolean;
  /**
   * True once the swap branch has produced a balance during this flow — the
   * `via_swap` dimension on `earn.deposit_completed`.
   *
   * Lives here because the swap happens in the picker and the deposit metric is
   * emitted from the submit hook, two screens and one `resetSubmission()` apart.
   */
  didSwapInFlow: boolean;
}

export const initialState: EarnState = {
  pool: null,
  selectedAssetId: "",
  selectedAssetApy: null,
  currentPositionTokens: "0",
  hasSeenIntro: null,
  lastSubmitFailed: false,
  didSwapInFlow: false,
};

const earnSlice = createSlice({
  name: "earn",
  initialState,
  reducers: {
    saveEarnPool: (state, action: { payload: BlendCatalogPool | null }) => {
      state.pool = action.payload;
    },
    saveSelectedAssetApy: (state, action: { payload: number | null }) => {
      state.selectedAssetApy = action.payload;
    },
    saveSelectedAssetId: (state, action: { payload: string }) => {
      state.selectedAssetId = action.payload;
    },
    saveCurrentPositionTokens: (state, action: { payload: string }) => {
      state.currentPositionTokens = action.payload;
    },
    setEarnIntroSeen: (state, action: { payload: boolean }) => {
      state.hasSeenIntro = action.payload;
    },
    setEarnSubmitFailed: (state, action: { payload: boolean }) => {
      state.lastSubmitFailed = action.payload;
    },
    setDidSwapInFlow: (state, action: { payload: boolean }) => {
      state.didSwapInFlow = action.payload;
    },
    /**
     * Resets everything except `hasSeenIntro` — that flag is persisted in the
     * background store and re-reading it on every flow entry would reintroduce
     * the interstitial flash it exists to prevent.
     */
    resetEarn: (state) => ({
      ...initialState,
      hasSeenIntro: state.hasSeenIntro,
    }),
  },
});

export const {
  saveEarnPool,
  saveSelectedAssetApy,
  saveSelectedAssetId,
  saveCurrentPositionTokens,
  setEarnIntroSeen,
  setEarnSubmitFailed,
  setDidSwapInFlow,
  resetEarn,
} = earnSlice.actions;

export const { reducer } = earnSlice;

export const earnSelector = (state: { earn: EarnState }) => state.earn;

export const earnPoolSelector = (state: { earn: EarnState }) => state.earn.pool;

export const earnSubmitFailedSelector = (state: { earn: EarnState }) =>
  state.earn.lastSubmitFailed;
