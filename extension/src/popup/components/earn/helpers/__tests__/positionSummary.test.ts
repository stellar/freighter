import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/constants/sac";
import { getPositionSummary } from "../positionSummary";

const networkDetails = MAINNET_NETWORK_DETAILS;
const USDC_SAC = PUBLIC_SACS.USDC!;
const XLM_SAC = PUBLIC_SACS.XLM;

const usdcSupply = {
  assetId: USDC_SAC,
  symbol: "USDC",
  name: "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
  decimals: 7,
  suppliedTokens: "0",
  collateralTokens: "5001223000",
  totalTokens: "5001223000",
  usdValue: 500.12,
  apy: 0.1694,
  emissionsApr: 0,
  interestEarned: "1234000",
  interestEarnedUsd: 0.12,
  claimableBlnd: "0",
  claimableUsd: null,
  priceUsd: 1,
};

const xlmSupply = {
  ...usdcSupply,
  assetId: XLM_SAC,
  symbol: null,
  name: null,
  totalTokens: "1200400000",
  collateralTokens: "1200400000",
  usdValue: 120.04,
  apy: 0.121,
  interestEarned: "400000",
  interestEarnedUsd: 0.04,
};

const position = (supply: unknown[]) =>
  ({
    protocol: "blend",
    id: "CAJJ",
    name: "Fixed Pool v2",
    netUsd: 620.16,
    suppliedUsd: 620.16,
    borrowedUsd: 0,
    netApy: 0.16,
    blend: { supply, borrow: [] },
  }) as never;

describe("getPositionSummary — supply scope", () => {
  const summary = (
    focusedAssetId: string,
    supply: unknown[] = [usdcSupply, xlmSupply],
  ) =>
    getPositionSummary({
      position: position(supply),
      focusedAssetId,
      networkDetails,
      scope: "supply",
    });

  it("scopes every figure to the focused asset", () => {
    const result = summary(USDC_SAC);

    expect(result.currentBalanceUsd).toBe(500.12);
    expect(result.apy).toBeCloseTo(0.1694);
    expect(result.deposits).toHaveLength(1);
    expect(result.earnings).toHaveLength(1);
    expect(result.deposits[0].code).toBe("USDC");
  });

  it("scopes to the other asset when that row was tapped", () => {
    const result = summary(XLM_SAC);

    expect(result.currentBalanceUsd).toBe(120.04);
    expect(result.deposits[0].code).toBe("XLM");
  });

  it("reports deposits as principal, so balance equals deposits plus earnings", () => {
    // total_tokens carries accrued interest; counting it in BOTH cards would
    // double-count the same $0.12. See design doc Q2.
    const result = summary(USDC_SAC);

    expect(result.deposits[0].usd).toBeCloseTo(500.0);
    expect(result.deposits[0].tokens).toBe("499.9989");
    expect(result.earnings[0].usd).toBeCloseTo(0.12);
    expect(result.earnings[0].tokens).toBe("0.1234");
  });

  it("keeps deposit usd null when interest usd is unknown, instead of crediting the whole balance as principal", () => {
    // interestEarnedUsd is nullable independently of usdValue. Defaulting it
    // to 0 here would show the full balance as principal on the Deposits
    // card while the Earnings card shows "--" for that same asset — two
    // displayed numbers that no longer sum to the displayed Current Balance.
    const result = summary(USDC_SAC, [
      { ...usdcSupply, interestEarnedUsd: null },
    ]);

    expect(result.deposits[0].usd).toBeNull();
    expect(result.earnings[0].usd).toBeNull();
  });

  it("keeps deposit usd and projections null when the balance itself is unknown", () => {
    const result = summary(USDC_SAC, [{ ...usdcSupply, usdValue: null }]);

    expect(result.deposits[0].usd).toBeNull();
    expect(result.estYearlyUsd).toBeNull();
    expect(result.estMonthlyUsd).toBeNull();
  });

  it("projects once from the scoped balance and rate", () => {
    const result = summary(USDC_SAC);

    expect(result.estYearlyUsd).toBe("84.70");
    expect(result.estMonthlyUsd).toBe("7.06");
  });

  it("keeps projections null when the rate is unavailable", () => {
    const result = summary(USDC_SAC, [{ ...usdcSupply, apy: null }]);

    expect(result.apy).toBeNull();
    expect(result.estYearlyUsd).toBeNull();
    expect(result.estMonthlyUsd).toBeNull();
  });

  it("falls back to the first supplied row when no asset was named", () => {
    const result = getPositionSummary({
      position: position([usdcSupply, xlmSupply]),
      networkDetails,
      scope: "supply",
    });

    expect(result.deposits[0].code).toBe("USDC");
  });
});

describe("getPositionSummary — pool scope", () => {
  it("aggregates every supplied row under the pool's own totals", () => {
    const result = getPositionSummary({
      position: position([usdcSupply, xlmSupply]),
      networkDetails,
      scope: "pool",
    });

    expect(result.currentBalanceUsd).toBe(620.16);
    expect(result.apy).toBeCloseTo(0.16);
    expect(result.deposits).toHaveLength(2);
    expect(result.earnings).toHaveLength(2);
    // One pair of Est. rows, from the pool total — never one pair per asset.
    expect(result.estYearlyUsd).toBe("99.20");
  });
});
