import { METRIC_NAMES } from "popup/constants/metricsNames";

describe("METRIC_NAMES swap-to-new-token events", () => {
  it("defines the new swap events", () => {
    expect(METRIC_NAMES.swapPickerOpened).toBe("swap: picker opened");
    expect(METRIC_NAMES.swapSourceSelected).toBe("swap: source selected");
    expect(METRIC_NAMES.swapDestinationSelected).toBe(
      "swap: destination selected",
    );
    expect(METRIC_NAMES.swapDirectionToggled).toBe("swap: direction toggled");
    expect(METRIC_NAMES.swapTrustlineAdded).toBe("swap: trustline added");
    expect(METRIC_NAMES.swapXlmReserveShown).toBe("swap: xlm reserve shown");
    expect(METRIC_NAMES.swapQuoteExpired).toBe("swap: quote expired");
    expect(METRIC_NAMES.swapSuccess).toBe("swap: success");
  });
});
