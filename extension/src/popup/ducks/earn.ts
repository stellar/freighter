import { createSlice } from "@reduxjs/toolkit";

import { BlendCatalogPool } from "@shared/api/types/blend";
import { EARN_SOURCE, EarnSource } from "popup/constants/earn";

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
/**
 * A deposit that has landed on the ledger but may not be in Positions yet.
 *
 * Positions come from an indexer that trails the ledger by a few seconds, so a
 * read straight after the deposit can still return the old amount. Home keeps
 * re-reading until the deposited reserve holds at least `minTokens`.
 */
export interface AwaitedDeposit {
  publicKey: string;
  network: string;
  poolId: string;
  /** The reserve's contract address (its SAC), as Positions rows carry it. */
  assetId: string;
  /**
   * The least the reserve must hold once the deposit shows, in display units:
   * the position before it plus half the deposit. Half, because interest only
   * adds to the amount, while a full-amount bar could miss by a rounding unit.
   */
  minTokens: string;
  /** Epoch ms after which Home stops waiting and leaves it to the 30s poll. */
  expiresAt: number;
}

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
   * The chosen asset's rate (supply interest only, no BLND emissions) as a
   * decimal fraction, or null when the oracle has no fresh price. Carried from the token
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
  /**
   * Where this deposit flow began — Home's Earn button or a Positions row/empty
   * CTA. The `source` dimension on `earn.deposit_completed` / `earn.deposit_failed`.
   *
   * Lives here for the same reason `didSwapInFlow` does: those outcomes are
   * emitted from the submit hook and from the Earn view's submit-status effect,
   * both several screens and one `resetSubmission()` away from wherever the flow
   * actually started. `views/Earn` sets it once at mount from the URL (see
   * `getEarnSourceFromSearch`) rather than a caller dispatching it before
   * navigating, because that view rewrites its own search string when the swap
   * branch opens and closes, which would carry away a flag set any other way.
   */
  source: EarnSource;
  /**
   * The amount the staged deposit was built with, in display units
   * ("1234.56"), recorded when Review opens. Review and the deposit screens show
   * it rather than the amount field, which stays editable while a build runs,
   * so what they show is always what Confirm signs. Null until a deposit has
   * been reviewed.
   */
  reviewedAmount: string | null;
  /**
   * Set when a deposit lands, cleared by Home once Positions show it or the
   * wait expires. Survives `resetEarn()`: the flow resets as it closes, which is
   * exactly when Home starts waiting.
   */
  awaitedDeposit: AwaitedDeposit | null;
}

export const initialState: EarnState = {
  pool: null,
  selectedAssetId: "",
  selectedAssetApy: null,
  currentPositionTokens: "0",
  hasSeenIntro: null,
  lastSubmitFailed: false,
  didSwapInFlow: false,
  source: EARN_SOURCE.HOME,
  reviewedAmount: null,
  awaitedDeposit: null,
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
    saveEarnSource: (state, action: { payload: EarnSource }) => {
      state.source = action.payload;
    },
    saveReviewedAmount: (state, action: { payload: string | null }) => {
      state.reviewedAmount = action.payload;
    },
    saveAwaitedDeposit: (state, action: { payload: AwaitedDeposit | null }) => {
      state.awaitedDeposit = action.payload;
    },
    /**
     * Clears what a deposit attempt leaves behind: its failure banner, its
     * swap, the amount it reviewed and the position it fetched. Earn runs it as
     * it opens, because only its X button runs `resetEarn`, and other ways
     * out (Buy, for one) would carry these into the next visit. The pool and
     * token are left alone: whatever opens the amount screen sets them.
     */
    resetEarnAttempt: (state) => {
      state.currentPositionTokens = initialState.currentPositionTokens;
      state.lastSubmitFailed = initialState.lastSubmitFailed;
      state.didSwapInFlow = initialState.didSwapInFlow;
      state.reviewedAmount = initialState.reviewedAmount;
    },
    /**
     * Resets everything except `hasSeenIntro` and `awaitedDeposit`.
     * `hasSeenIntro` is persisted in the background store, and re-reading it on
     * every flow entry would reintroduce the interstitial flash it exists to
     * prevent. `awaitedDeposit` belongs to Home from the moment it is set.
     */
    resetEarn: (state) => ({
      ...initialState,
      hasSeenIntro: state.hasSeenIntro,
      awaitedDeposit: state.awaitedDeposit,
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
  saveEarnSource,
  saveReviewedAmount,
  saveAwaitedDeposit,
  resetEarnAttempt,
  resetEarn,
} = earnSlice.actions;

export const { reducer } = earnSlice;

export const earnSelector = (state: { earn: EarnState }) => state.earn;
export const awaitedDepositSelector = (state: { earn: EarnState }) =>
  state.earn.awaitedDeposit;
