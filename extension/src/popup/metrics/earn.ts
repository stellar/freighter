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

/** A percentage shortcut on the amount screen; `percent: 100` is Max. */
export const trackEarnPercentAmountSelected = ({
  assetCode,
  percent,
}: {
  assetCode: string;
  percent: number;
}) => {
  emitMetric(METRIC_NAMES.earnMaxAmountSelected, {
    asset_code: assetCode,
    percent,
  });
};

/**
 * Close pressed while the deposit was still in flight. The flow deliberately
 * does not follow the submission after that, so this event is the only record
 * that an outcome exists which no `completed`/`failed` event will report.
 */
export const trackEarnDepositAbandoned = ({
  assetCode,
  poolId,
}: {
  assetCode: string;
  poolId: string;
}) => {
  emitMetric(METRIC_NAMES.earnDepositAbandoned, {
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
