import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  trackPoolSelected,
  trackPositionRowSelected,
  trackPositionsEmptyCtaSelected,
} from "popup/metrics/positions";

jest.mock("helpers/metrics", () => ({ emitMetric: jest.fn() }));
const mocked = emitMetric as jest.Mock;
beforeEach(() => mocked.mockReset());

describe("positions metrics", () => {
  it("reports a pool card tap", () => {
    trackPoolSelected({ poolId: "CAJJ", protocol: "blend" });

    expect(mocked).toHaveBeenCalledWith(METRIC_NAMES.positionPoolSelected, {
      pool_id: "CAJJ",
      protocol: "blend",
    });
  });

  it("reports a row tap with the pool it belongs to", () => {
    trackPositionRowSelected({
      poolId: "CAJJ",
      protocol: "blend",
      assetCode: "USDC",
    });

    expect(mocked).toHaveBeenCalledWith(METRIC_NAMES.positionRowSelected, {
      pool_id: "CAJJ",
      protocol: "blend",
      asset_code: "USDC",
    });
  });

  it("reports the empty state's CTA", () => {
    trackPositionsEmptyCtaSelected();

    expect(mocked).toHaveBeenCalledWith(
      METRIC_NAMES.positionsEmptyCtaSelected,
      {},
    );
  });
});
