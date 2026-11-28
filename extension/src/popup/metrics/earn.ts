import { emitMetric } from "helpers/metrics";
import { AssetIdentity, FailureCategory } from "helpers/usdVolume";
import {
  EarnSource,
  NotEnoughVariant,
  PoolDetailsTab,
} from "popup/constants/earn";
import { METRIC_NAMES } from "popup/constants/metricsNames";

/**
 * The protocol every `earn.*` event is about, so a dashboard can split Earn by
 * provider. Blend is the only one today; once a second provider exists this
 * comes from the pool the flow chose.
 */
export const EARN_PROTOCOL = "blend";

/** Emits an `earn.*` event, tagged with its protocol. */
const emitEarnMetric = (
  name: Parameters<typeof emitMetric>[0],
  props: Record<string, unknown>,
) => emitMetric(name, { ...props, protocol: EARN_PROTOCOL });

/**
 * Emitters for the Earn deposit funnel.
 *
 * Kept in one module — the way `send.ts` holds the Send flow's trackers — so the
 * property names each event carries are declared once and unit-testable, rather
 * than spelled out at eight call sites across the flow. Every emitter here takes
 * camelCase arguments and is the only place their snake_case wire names appear.
 *
 * The funnel steps carry no amount or fiat value. A deposit that reached the
 * network carries its USD volume on its outcome event, under the names
 * `payment.completed` and `payment.failed` use, so one `SUM(amount_usd)`
 * covers deposits too.
 *
 * `network`, `surface` and the account fields are stamped by buildCommonContext.
 */

/** A deposit's USD volume, for an outcome that reached the network. */
export interface EarnDepositVolume {
  identity: AssetIdentity;
  /** Deposited token amount, whole units. */
  amount: number;
  /** The `amount_usd` family, from `buildSourceLegUsdProps`. */
  usdProps: Record<string, unknown>;
}

const depositVolumeProps = (volume: EarnDepositVolume) => ({
  ...(volume.identity.issuer ? { asset_issuer: volume.identity.issuer } : {}),
  asset_type: volume.identity.type,
  amount: volume.amount,
  ...volume.usdProps,
});

/** Which remedy the user chose on the "Not enough X" sheet. */
export type EarnFundingAction = "buy" | "swap" | "transfer";

/**
 * Where a pool's details were opened from: the deposit screen's pool card, or
 * a supplied token on a pool's position screen (whose screen carries the pool's
 * Overview). Deliberately NOT `EarnSource`, which attributes deposits; opening
 * details is not one.
 */
export const POOL_DETAILS_SOURCE = {
  EARN_AMOUNT: "earn_amount",
  POSITION_ROW: "position_row",
} as const;

export type PoolDetailsSource =
  (typeof POOL_DETAILS_SOURCE)[keyof typeof POOL_DETAILS_SOURCE];

/**
 * The screen whose frozen-pool banner opened the "Why can't I deposit?"
 * sheet: the token picker, or a supplied token's position screen (named as in
 * `POOL_DETAILS_SOURCE`).
 */
export const POOL_FROZEN_INFO_SOURCE = {
  EARN_SELECT_TOKEN: "earn_select_token",
  POSITION_ROW: "position_row",
} as const;

export type PoolFrozenInfoSource =
  (typeof POOL_FROZEN_INFO_SOURCE)[keyof typeof POOL_FROZEN_INFO_SOURCE];

export const trackEarnTokenSelected = ({
  assetCode,
  poolId,
  apy,
}: {
  assetCode: string;
  poolId: string;
  apy: number | null;
}) => {
  emitEarnMetric(METRIC_NAMES.earnTokenSelected, {
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
  emitEarnMetric(METRIC_NAMES.earnBalanceInsufficientShown, {
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
  emitEarnMetric(METRIC_NAMES.earnFundingActionSelected, {
    asset_code: assetCode,
    action,
  });
};

/**
 * The pool details sheet opened, and which entry point opened it.
 */
export const trackEarnPoolDetailsOpened = ({
  poolId,
  source,
}: {
  poolId: string;
  source: PoolDetailsSource;
}) => {
  emitEarnMetric(METRIC_NAMES.earnPoolDetailsOpened, {
    pool_id: poolId,
    source,
  });
};

export const trackEarnPoolDetailsTabSelected = ({
  poolId,
  tab,
  source,
}: {
  poolId: string;
  tab: PoolDetailsTab;
  source: PoolDetailsSource;
}) => {
  emitEarnMetric(METRIC_NAMES.earnPoolDetailsTabSelected, {
    pool_id: poolId,
    tab,
    source,
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
  emitEarnMetric(METRIC_NAMES.earnXlmFeeInsufficientShown, {
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
  emitEarnMetric(METRIC_NAMES.earnSimulationFailed, {
    asset_code: assetCode,
    reason_code: reasonCode,
  });
};

/**
 * A frozen pool's banner was tapped, opening the sheet that explains why it
 * takes no deposits. `poolStatus` tells an admin freeze from a draining
 * backstop (or a pool still in setup).
 */
export const trackEarnPoolFrozenInfoOpened = ({
  poolId,
  poolStatus,
  source,
}: {
  poolId: string;
  poolStatus: string | null;
  source: PoolFrozenInfoSource;
}) => {
  emitEarnMetric(METRIC_NAMES.earnPoolFrozenInfoOpened, {
    pool_id: poolId,
    pool_status: poolStatus,
    source,
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

  emitEarnMetric(METRIC_NAMES.earnMaxAmountSelected, {
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
  emitEarnMetric(METRIC_NAMES.earnDepositDismissed, {
    asset_code: assetCode,
    pool_id: poolId,
  });
};

export const trackEarnDepositCompleted = ({
  assetCode,
  poolId,
  apy,
  viaSwap,
  source,
  volume,
}: {
  assetCode: string;
  poolId: string;
  apy: number | null;
  /** The deposited balance was created by the swap branch in this same flow. */
  viaSwap: boolean;
  /** Where the flow began — Home's Earn button or a Positions row/empty CTA. */
  source: EarnSource;
  volume?: EarnDepositVolume;
}) => {
  emitEarnMetric(METRIC_NAMES.earnDepositCompleted, {
    asset_code: assetCode,
    pool_id: poolId,
    apy,
    via_swap: viaSwap,
    source,
    ...(volume ? depositVolumeProps(volume) : {}),
  });
};

/**
 * Two emitters, split by where the failure happened: the submit hook owns its
 * own sign/submit rejections — its closure outlives the in-flight screen, so the
 * failure is still reported after the user closes it — and the Earn view owns
 * everything that fails earlier, a device-rejected signature at review being the
 * one that matters. Neither can see the other's failures, so they cannot double
 * count. Only a failure the network returned carries volume.
 */
export const trackEarnDepositFailed = ({
  assetCode,
  poolId,
  reasonCode,
  source,
  volume,
}: {
  assetCode: string;
  poolId: string;
  reasonCode: string;
  /** Where the flow began — Home's Earn button or a Positions row/empty CTA. */
  source: EarnSource;
  volume?: EarnDepositVolume & { failureCategory: FailureCategory };
}) => {
  emitEarnMetric(METRIC_NAMES.earnDepositFailed, {
    asset_code: assetCode,
    pool_id: poolId,
    reason_code: reasonCode,
    source,
    ...(volume
      ? {
          ...depositVolumeProps(volume),
          failure_category: volume.failureCategory,
        }
      : {}),
  });
};
