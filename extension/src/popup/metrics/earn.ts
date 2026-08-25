import { emitMetric } from "helpers/metrics";
import { NotEnoughVariant } from "popup/constants/earn";
import { METRIC_NAMES } from "popup/constants/metricsNames";

/**
 * Emitters for the Earn deposit funnel.
 *
 * Kept in one module — the way `send.ts` holds the Send flow's trackers — so the
 * property names each event carries are declared once and unit-testable, rather
 * than spelled out at eight call sites across the flow. Every emitter here takes
 * camelCase arguments and is the only place their snake_case wire names appear.
 *
 * None of these carry an amount or a fiat value: the sibling outcome events
 * (`payment.completed`, `swap.completed`) carry asset codes only, and deposit
 * size is measurable on-chain from the pool.
 *
 * `network`, `surface` and the account fields are stamped by buildCommonContext.
 */

/** Which remedy the user chose on the "Not enough X" sheet. */
export type EarnFundingAction = "buy" | "swap" | "transfer";

export const trackEarnTokenSelected = ({
  assetCode,
  poolId,
  apy,
}: {
  assetCode: string;
  poolId: string;
  apy: number | null;
}) => {
  emitMetric(METRIC_NAMES.earnTokenSelected, {
    asset_code: assetCode,
    pool_id: poolId,
    apy,
  });
};

/**
 * A pool-supported token the account holds none of was tapped. `variant` is the
 * set of remedies actually offered, so a drop-off can be read against what the
 * sheet made possible.
 */
export const trackEarnBalanceInsufficientShown = ({
  assetCode,
  variant,
}: {
  assetCode: string;
  variant: NotEnoughVariant;
}) => {
  emitMetric(METRIC_NAMES.earnBalanceInsufficientShown, {
    asset_code: assetCode,
    variant,
  });
};

/**
 * Buy also emits `onramp.coinbase_opened` from useGetOnrampToken. That event is
 * not Earn-scoped, so the funnel needs its own step to compare the three
 * remedies against each other.
 */
export const trackEarnFundingActionSelected = ({
  assetCode,
  action,
}: {
  assetCode: string;
  action: EarnFundingAction;
}) => {
  emitMetric(METRIC_NAMES.earnFundingActionSelected, {
    asset_code: assetCode,
    action,
  });
};

/**
 * The swap branch settled and returned to the picker. Distinct from
 * `swap.completed`, which the reused Swap components emit for every swap and
 * cannot attribute to Earn.
 */
export const trackEarnSwapCompleted = ({
  fromAssetCode,
  toAssetCode,
}: {
  fromAssetCode: string;
  toAssetCode: string;
}) => {
  emitMetric(METRIC_NAMES.earnSwapCompleted, {
    from_asset_code: fromAssetCode,
    to_asset_code: toAssetCode,
  });
};

/**
 * The deposit could not cover its own network fee. Two shapes, told apart by
 * `reason`: `no_xlm` is an account with no spendable XLM at all, which gets the
 * buy/swap sheet; `fee_not_covered` is an amount that leaves less XLM than the
 * simulated resource fee, which gets an inline message asking for a smaller
 * deposit. Deliberately one event — both are the same drop-off — but the remedy
 * differs, so the funnel needs to tell them apart.
 */
export const trackEarnXlmFeeInsufficientShown = ({
  assetCode,
  reason,
}: {
  assetCode: string;
  reason: "no_xlm" | "fee_not_covered";
}) => {
  emitMetric(METRIC_NAMES.earnXlmFeeInsufficientShown, {
    asset_code: assetCode,
    reason,
  });
};

export const trackEarnSimulationFailed = ({
  assetCode,
  reasonCode,
}: {
  assetCode: string;
  reasonCode: string;
}) => {
  emitMetric(METRIC_NAMES.earnSimulationFailed, {
    asset_code: assetCode,
    reason_code: reasonCode,
  });
};

/**
 * The Max tap on the amount screen. Called for every percentage shortcut, but
 * only 100 emits: a 25/50/75 tap is not a set-max, and an event named
 * `max_amount_selected` that also fires for partials makes anything keyed on
 * the name alone (dashboards, funnels, alerting) count partials as Max usage.
 *
 * Send and Swap gate identically (RFC #2883, D5) and so does mobile — the
 * max-amount action fires on the max tap only, on send, swap and earn alike.
 * If Earn ever needs partial-shortcut usage, add a separately named event
 * rather than widening this one.
 */
export const trackEarnPercentAmountSelected = ({
  assetCode,
  percent,
}: {
  assetCode: string;
  percent: number;
}) => {
  if (percent !== 100) {
    return;
  }

  emitMetric(METRIC_NAMES.earnMaxAmountSelected, {
    asset_code: assetCode,
    percent,
  });
};

/**
 * Close pressed while the deposit was still in flight — the user stopped
 * watching, not the deposit. By the time that button renders the envelope is
 * already being signed and submitted, and nothing cancels it; the submit hook's
 * continuation outlives the screen, so `deposit_completed` or `deposit_failed`
 * for the same attempt normally follows this event.
 *
 * A UX signal, then, not an outcome: how often the wait outlasts the user's
 * patience. The outcome is genuinely missing only when the popup itself is
 * closed, which kills the page before either event can be emitted.
 */
export const trackEarnDepositDismissed = ({
  assetCode,
  poolId,
}: {
  assetCode: string;
  poolId: string;
}) => {
  emitMetric(METRIC_NAMES.earnDepositDismissed, {
    asset_code: assetCode,
    pool_id: poolId,
  });
};

export const trackEarnDepositCompleted = ({
  assetCode,
  poolId,
  apy,
  viaSwap,
}: {
  assetCode: string;
  poolId: string;
  apy: number | null;
  /** The deposited balance was created by the swap branch in this same flow. */
  viaSwap: boolean;
}) => {
  emitMetric(METRIC_NAMES.earnDepositCompleted, {
    asset_code: assetCode,
    pool_id: poolId,
    apy,
    via_swap: viaSwap,
  });
};

/**
 * Two emitters, split by where the failure happened: the submit hook owns its
 * own sign/submit rejections — its closure outlives the in-flight screen, so the
 * failure is still reported after the user closes it — and the Earn view owns
 * everything that fails earlier, a device-rejected signature at review being the
 * one that matters. Neither can see the other's failures, so they cannot double
 * count.
 */
export const trackEarnDepositFailed = ({
  assetCode,
  poolId,
  reasonCode,
}: {
  assetCode: string;
  poolId: string;
  reasonCode: string;
}) => {
  emitMetric(METRIC_NAMES.earnDepositFailed, {
    asset_code: assetCode,
    pool_id: poolId,
    reason_code: reasonCode,
  });
};
