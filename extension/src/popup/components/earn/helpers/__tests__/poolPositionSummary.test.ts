import { getPoolPositionSummary } from "../poolPositionSummary";

const supply = (over: Record<string, unknown> = {}) => ({
  assetId: "CUSDC",
  symbol: "USDC",
  name: null,
  decimals: 7,
  suppliedTokens: "0",
  collateralTokens: "0",
  totalTokens: "0",
  usdValue: 500.12,
  apy: 0.1694,
  emissionsApr: 0,
  interestEarned: "0",
  interestEarnedUsd: 0.12,
  claimableBlnd: "0",
  claimableUsd: null,
  priceUsd: 1,
  ...over,
});

const position = (rows: unknown[], over: Record<string, unknown> = {}) =>
  ({
    protocol: "blend",
    id: "CAJJ",
    name: "Fixed Pool v2",
    netUsd: 1284.32,
    suppliedUsd: 1284.32,
    borrowedUsd: 0,
    netApy: 0.1023,
    blend: { supply: rows, borrow: [] },
    ...over,
  }) as never;

describe("getPoolPositionSummary", () => {
  it("sums interest across every supplied asset", () => {
    const result = getPoolPositionSummary(
      position([
        supply({ interestEarnedUsd: 0.12 }),
        supply({ interestEarnedUsd: 31.63 }),
      ]),
    );

    expect(result.interestUsd).toBeCloseTo(31.75);
    expect(result.totalUsd).toBe(1284.32);
    expect(result.apy).toBeCloseTo(0.1023);
  });

  it("measures the gain against principal, not the current total", () => {
    // R8: measured against principal, not the total.
    // 1284.32 - 31.75 = 1252.57 principal; 31.75 / 1252.57 = 2.535% -> the
    // 2.54% both frames show. Dividing by the total would give 2.47%.
    const result = getPoolPositionSummary(
      position([supply({ interestEarnedUsd: 31.75 })]),
    );

    expect(result.gainPercent).toBeCloseTo(0.02535, 5);
  });

  it("treats one unpriced row as making the whole interest total unknown", () => {
    const result = getPoolPositionSummary(
      position([
        supply({ interestEarnedUsd: 0.12 }),
        supply({ interestEarnedUsd: null }),
      ]),
    );

    expect(result.interestUsd).toBeNull();
    expect(result.gainPercent).toBeNull();
  });

  it("keeps an unpriced pool total from producing a gain", () => {
    const result = getPoolPositionSummary(
      position([supply()], { netUsd: null }),
    );

    expect(result.totalUsd).toBeNull();
    expect(result.gainPercent).toBeNull();
  });

  it("returns null rather than Infinity when principal is zero", () => {
    // A position that is entirely accrued interest: total equals interest, so
    // principal is 0 and the ratio is undefined.
    const result = getPoolPositionSummary(
      position([supply({ interestEarnedUsd: 50 })], { netUsd: 50 }),
    );

    expect(result.gainPercent).toBeNull();
    expect(Number.isFinite(result.gainPercent as number)).toBe(false);
  });

  it("reports zero interest as a real zero, not unknown", () => {
    const result = getPoolPositionSummary(
      position([supply({ interestEarnedUsd: 0 })]),
    );

    expect(result.interestUsd).toBe(0);
    expect(result.gainPercent).toBe(0);
  });

  it("reports zero interest for a position whose detail is present but empty", () => {
    // Distinct from the no-detail case below: here we KNOW there is nothing
    // supplied, so the interest really is zero rather than unknown.
    const result = getPoolPositionSummary(position([]));

    expect(result.interestUsd).toBe(0);
  });

  it("handles a position carrying no blend detail", () => {
    const result = getPoolPositionSummary({
      protocol: "blend",
      id: "CAJJ",
      name: null,
      netUsd: null,
      suppliedUsd: null,
      borrowedUsd: null,
      netApy: null,
    } as never);

    expect(result).toEqual({
      totalUsd: null,
      interestUsd: null,
      gainPercent: null,
      apy: null,
    });
  });
});
