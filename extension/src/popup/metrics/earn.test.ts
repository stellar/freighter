import { emitMetric } from "helpers/metrics";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { NETWORKS } from "@shared/constants/stellar";
import { NotEnoughVariant } from "popup/constants/earn";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import {
  trackEarnBalanceInsufficientShown,
  trackEarnDepositDismissed,
  trackEarnDepositCompleted,
  trackEarnDepositFailed,
  trackEarnFundingActionSelected,
  trackEarnPercentAmountSelected,
  trackEarnSimulationFailed,
  trackEarnSwapCompleted,
  trackEarnTokenSelected,
  trackEarnXlmFeeInsufficientShown,
} from "./earn";

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

const mockEmitMetric = emitMetric as jest.MockedFunction<typeof emitMetric>;

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;

describe("Earn funnel metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports the token selection with its pool and rate", () => {
    trackEarnTokenSelected({
      assetCode: "USDC",
      poolId: POOL_ID,
      apy: 0.1694,
    });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnTokenSelected,
      {
        asset_code: "USDC",
        pool_id: POOL_ID,
        apy: 0.1694,
      },
    );
  });

  it("keeps a null rate null rather than coercing it to zero", () => {
    trackEarnTokenSelected({ assetCode: "EURC", poolId: POOL_ID, apy: null });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnTokenSelected,
      {
        asset_code: "EURC",
        pool_id: POOL_ID,
        apy: null,
      },
    );
  });

  it("reports the insufficient-balance sheet with the variant shown", () => {
    trackEarnBalanceInsufficientShown({
      assetCode: "EURC",
      variant: NotEnoughVariant.SWAP_OR_TRANSFER,
    });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnBalanceInsufficientShown,
      { asset_code: "EURC", variant: "swap-or-transfer" },
    );
  });

  it.each(["buy", "swap", "transfer"] as const)(
    "reports the %s remedy",
    (action) => {
      trackEarnFundingActionSelected({ assetCode: "USDC", action });

      expect(mockEmitMetric).toHaveBeenCalledWith(
        METRIC_NAMES.earnFundingActionSelected,
        { asset_code: "USDC", action },
      );
    },
  );

  it("reports an in-earn swap separately from swap.completed", () => {
    trackEarnSwapCompleted({ fromAssetCode: "XLM", toAssetCode: "USDC" });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnSwapCompleted,
      {
        from_asset_code: "XLM",
        to_asset_code: "USDC",
      },
    );
  });

  it("tells the two XLM-fee shortfalls apart", () => {
    // Same drop-off, different remedy: one account has no XLM at all and gets
    // the buy/swap sheet, the other allocated it all to the deposit.
    trackEarnXlmFeeInsufficientShown({ assetCode: "USDC", reason: "no_xlm" });
    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnXlmFeeInsufficientShown,
      { asset_code: "USDC", reason: "no_xlm" },
    );

    trackEarnXlmFeeInsufficientShown({
      assetCode: "XLM",
      reason: "fee_not_covered",
    });
    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnXlmFeeInsufficientShown,
      { asset_code: "XLM", reason: "fee_not_covered" },
    );
  });

  it("reports a simulation failure with its reason", () => {
    trackEarnSimulationFailed({
      assetCode: "XLM",
      reasonCode: "simulation failed",
    });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnSimulationFailed,
      { asset_code: "XLM", reason_code: "simulation failed" },
    );
  });

  it("reports Max as percent 100", () => {
    trackEarnPercentAmountSelected({ assetCode: "XLM", percent: 100 });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnMaxAmountSelected,
      { asset_code: "XLM", percent: 100 },
    );
  });

  it.each([25, 50, 75])(
    "does not report a %i%% shortcut as a set-max",
    (percent) => {
      trackEarnPercentAmountSelected({ assetCode: "XLM", percent });

      expect(mockEmitMetric).not.toHaveBeenCalled();
    },
  );

  it("reports an in-flight deposit the user stopped watching", () => {
    trackEarnDepositDismissed({ assetCode: "USDC", poolId: POOL_ID });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnDepositDismissed,
      { asset_code: "USDC", pool_id: POOL_ID },
    );
  });

  it("reports a completed deposit with its swap attribution", () => {
    trackEarnDepositCompleted({
      assetCode: "USDC",
      poolId: POOL_ID,
      apy: 0.1694,
      viaSwap: true,
    });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnDepositCompleted,
      {
        asset_code: "USDC",
        pool_id: POOL_ID,
        apy: 0.1694,
        via_swap: true,
      },
    );
  });

  it("carries no amount or fiat value on the deposit events", () => {
    trackEarnDepositCompleted({
      assetCode: "USDC",
      poolId: POOL_ID,
      apy: 0.1694,
      viaSwap: false,
    });

    const [, body] = mockEmitMetric.mock.calls[0];
    expect(Object.keys(body || {})).toEqual([
      "asset_code",
      "pool_id",
      "apy",
      "via_swap",
    ]);
  });

  it("reports a failed deposit with a result code", () => {
    trackEarnDepositFailed({
      assetCode: "USDC",
      poolId: POOL_ID,
      reasonCode: "op_underfunded",
    });

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.earnDepositFailed,
      {
        asset_code: "USDC",
        pool_id: POOL_ID,
        reason_code: "op_underfunded",
      },
    );
  });
});
