import {
  formatAccountUsd,
  formatCompactUsd,
  formatRate,
} from "../formatPoolStats";

describe("formatAccountUsd", () => {
  it("renders a four-figure balance in full, never compact", () => {
    // formatCompactUsd goes compact at $1,000, dropping cents from a personal
    // balance ("$1.50K" for $1,500) -- account-scale money always shows in full.
    expect(formatAccountUsd(1500)).toBe("$1,500.00");
  });

  it("truncates rather than rounds, matching the Positions row it was factored out of", () => {
    expect(formatAccountUsd(500.125)).toBe("$500.12");
  });

  it("distinguishes an unavailable value from zero", () => {
    expect(formatAccountUsd(null)).toBe("--");
    expect(formatAccountUsd(0)).toBe("$0.00");
  });

  it("groups thousands", () => {
    expect(formatAccountUsd(1234567)).toBe("$1,234,567.00");
  });

  it("renders an exact-cent value at its own cent, not one cent low", () => {
    // roundUsdValue floors via floating-point multiplication: 1.15 * 100 ===
    // 114.99999999999999, so Math.floor lands on 114 and the value renders
    // "$1.14". formatAccountUsd must not inherit that -- it does its own
    // truncation via BigNumber, which is exact.
    expect(formatAccountUsd(1.15)).toBe("$1.15");
    expect(formatAccountUsd(0.29)).toBe("$0.29");
    expect(formatAccountUsd(2.01)).toBe("$2.01");
  });
});

describe("formatCompactUsd", () => {
  it("renders millions compactly", () => {
    expect(formatCompactUsd(50050000)).toBe("$50.05M");
  });

  it("renders billions compactly", () => {
    expect(formatCompactUsd(1530000000)).toBe("$1.53B");
    // The Backstop figure in the design.
    expect(formatCompactUsd(1530000)).toBe("$1.53M");
  });

  it("renders thousands compactly", () => {
    expect(formatCompactUsd(16150)).toBe("$16.15K");
  });

  it("renders small amounts in full", () => {
    expect(formatCompactUsd(942.5)).toBe("$942.50");
  });

  it("distinguishes an unavailable value from zero", () => {
    // null means the pool oracle has no fresh price; 0 means the pool really
    // holds nothing. Collapsing them would misreport an empty pool.
    expect(formatCompactUsd(null)).toBe("--");
    expect(formatCompactUsd(0)).toBe("$0.00");
  });

  it("groups thousands in the non-compact range", () => {
    expect(formatCompactUsd(999.99)).toBe("$999.99");
  });
});

describe("formatRate", () => {
  it("converts a decimal fraction to a percentage", () => {
    expect(formatRate(0.1694)).toBe("16.94%");
  });

  it("distinguishes an unavailable rate from zero", () => {
    expect(formatRate(null)).toBe("--");
    expect(formatRate(0)).toBe("0.00%");
  });

  it("rounds to two places", () => {
    expect(formatRate(0.042419)).toBe("4.24%");
  });

  it("handles a rate above 100%", () => {
    expect(formatRate(1.5)).toBe("150.00%");
  });
});
