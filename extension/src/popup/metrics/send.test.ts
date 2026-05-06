import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { trackSendFeeBreakdownOpened } from "./send";

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

const mockEmitMetric = emitMetric as jest.MockedFunction<typeof emitMetric>;

describe("trackSendFeeBreakdownOpened", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits the settings entry-point metric", () => {
    trackSendFeeBreakdownOpened("settings");

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.sendPaymentFeeBreakdownOpened,
      { entry_point: "settings" },
    );
  });

  it("emits the review entry-point metric", () => {
    trackSendFeeBreakdownOpened("review");

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.sendPaymentFeeBreakdownOpened,
      { entry_point: "review" },
    );
  });
});
