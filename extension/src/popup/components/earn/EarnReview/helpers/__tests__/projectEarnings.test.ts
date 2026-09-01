import { formatProjection, projectEarnings } from "../projectEarnings";

describe("projectEarnings", () => {
  it("projects yearly and monthly from the deposit's USD value", () => {
    // The design's worked example: $500 at 16.94% -> $84.70/yr, $7.06/mo.
    expect(projectEarnings({ depositUsd: "500", apy: 0.1694 })).toEqual({
      yearly: "84.70",
      monthly: "7.06",
    });
  });

  it("treats monthly as a twelfth of the annual figure", () => {
    // Simple interest, not a compounded monthly rate: the APY moves with pool
    // utilization, so compounding would imply precision the estimate lacks.
    const { yearly, monthly } = projectEarnings({
      depositUsd: "1200",
      apy: 0.12,
    });

    expect(yearly).toBe("144.00");
    expect(monthly).toBe("12.00");
  });

  it("returns zero for a zero rate", () => {
    // A real zero rate earns nothing — distinct from an unknown rate.
    expect(projectEarnings({ depositUsd: "500", apy: 0 })).toEqual({
      yearly: "0.00",
      monthly: "0.00",
    });
  });

  it("returns nulls when the rate is unavailable", () => {
    expect(projectEarnings({ depositUsd: "500", apy: null })).toEqual({
      yearly: null,
      monthly: null,
    });
  });

  it("returns nulls when the asset has no price", () => {
    expect(projectEarnings({ depositUsd: null, apy: 0.1694 })).toEqual({
      yearly: null,
      monthly: null,
    });
  });

  it("handles a zero deposit", () => {
    expect(projectEarnings({ depositUsd: "0", apy: 0.1694 })).toEqual({
      yearly: "0.00",
      monthly: "0.00",
    });
  });

  it("does not lose precision on a large deposit", () => {
    expect(projectEarnings({ depositUsd: "1000000", apy: 0.0424 })).toEqual({
      yearly: "42400.00",
      monthly: "3533.33",
    });
  });
});

describe("formatProjection", () => {
  it("formats a known value as USD", () => {
    expect(formatProjection("84.70")).toBe("$84.70");
  });

  it("groups thousands", () => {
    expect(formatProjection("42400.00")).toBe("$42,400.00");
  });

  it("renders an unknown value as --", () => {
    expect(formatProjection(null)).toBe("--");
  });

  it("renders a real zero as $0.00", () => {
    expect(formatProjection("0.00")).toBe("$0.00");
  });
});
