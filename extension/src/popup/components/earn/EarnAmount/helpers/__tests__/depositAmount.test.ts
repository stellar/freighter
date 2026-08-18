import { getPercentageDepositAmount } from "../depositAmount";

describe("getPercentageDepositAmount", () => {
  // The max spendable from the report: available less the XLM fee reserve.
  const maxDepositable = "9998.3942586";

  it("treats the reported value as whole percents, not a multiplier", () => {
    expect(
      getPercentageDepositAmount({ maxDepositable, pct: 25, decimals: 7 }),
    ).toBe("2499.5985646");
    // The regression: multiplying by the raw percent produced this.
    expect(
      getPercentageDepositAmount({ maxDepositable, pct: 25, decimals: 7 }),
    ).not.toBe("249959.856465");
  });

  it("covers the rest of the button set", () => {
    expect(
      getPercentageDepositAmount({ maxDepositable, pct: 50, decimals: 7 }),
    ).toBe("4999.1971293");
    expect(
      getPercentageDepositAmount({ maxDepositable, pct: 75, decimals: 7 }),
    ).toBe("7498.7956939");
  });

  it("Max commits exactly the maximum spendable", () => {
    expect(
      getPercentageDepositAmount({ maxDepositable, pct: 100, decimals: 7 }),
    ).toBe("9998.3942586");
  });

  it("never rounds up past the maximum spendable", () => {
    // 75% of this is 0.7499999999...; ROUND_HALF_UP at 7dp would exceed it.
    expect(
      getPercentageDepositAmount({
        maxDepositable: "0.99999999",
        pct: 75,
        decimals: 7,
      }),
    ).toBe("0.7499999");
  });

  it("respects a token's own precision", () => {
    expect(
      getPercentageDepositAmount({
        maxDepositable: "100.555",
        pct: 25,
        decimals: 2,
      }),
    ).toBe("25.13");
  });

  it("stays at zero when there is nothing to deposit", () => {
    expect(
      getPercentageDepositAmount({
        maxDepositable: "0",
        pct: 100,
        decimals: 7,
      }),
    ).toBe("0");
  });
});
