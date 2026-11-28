import { formatEarnAmount } from "../formatEarnAmount";

describe("formatEarnAmount", () => {
  it("shows at least two decimals", () => {
    expect(formatEarnAmount("500")).toBe("500.00");
    expect(formatEarnAmount("0")).toBe("0.00");
    expect(formatEarnAmount("1234.5")).toBe("1,234.50");
  });

  it("keeps every decimal beyond two", () => {
    expect(formatEarnAmount("0.0000001")).toBe("0.0000001");
    expect(formatEarnAmount("1000.123")).toBe("1,000.123");
  });

  it("reads an empty amount as zero", () => {
    expect(formatEarnAmount("")).toBe("0.00");
  });
});
