import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/constants/sac";
import { getPositionSummary, hasResolvableSupply } from "../positionSummary";

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

describe("getPositionSummary", () => {
  const summary = (
    focusedAssetId: string,
    supply: unknown[] = [usdcSupply, xlmSupply],
  ) =>
    getPositionSummary({
      position: position(supply),
      focusedAssetId,
      networkDetails,
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
    });

    expect(result.deposits[0].code).toBe("USDC");
  });

  it("resolves to an empty scope when the focused asset matches nothing, instead of the first row", () => {
    // EarnAmount always names the asset it is depositing, so a mismatch means
    // the account has no position in THAT asset yet -- not "no asset was
    // named". Falling back to supply[0] would show a different asset's
    // figures under this asset's headers.
    const result = summary("UNRELATED_ASSET_ID_NOT_IN_SUPPLY");

    expect(result.currentBalanceUsd).toBeNull();
    expect(result.apy).toBeNull();
    expect(result.deposits).toEqual([]);
    expect(result.earnings).toEqual([]);
    expect(result.estMonthlyUsd).toBeNull();
    expect(result.estYearlyUsd).toBeNull();
  });

  describe("principal out of range", () => {
    it("reports no principal reading for a fully-exited row, rather than a negative figure", () => {
      // total_tokens is the CURRENT balance; a fully-exited row still carries
      // its lifetime interest_earned, so total_tokens - interest_earned goes
      // negative even though nothing is wrong with the payload.
      const result = summary(USDC_SAC, [
        { ...usdcSupply, totalTokens: "0", collateralTokens: "0", usdValue: 0 },
      ]);

      expect(result.deposits[0].tokens).toBe("0");
      expect(result.deposits[0].usd).toBeNull();
      // Untouched by the guard: earnings still reports the real lifetime
      // interest, and the header balance still reads the real (zero) total.
      expect(result.earnings[0].usd).toBeCloseTo(0.12);
      expect(result.currentBalanceUsd).toBe(0);
    });

    it("reports no principal reading for an over-withdrawn row, rather than a negative figure", () => {
      // The review's concrete failure: supply 1,000 USDC, accrue 50, withdraw
      // 1,020 -> total_tokens = 30, interest_earned = 50.
      const result = summary(USDC_SAC, [
        {
          ...usdcSupply,
          totalTokens: "300000000",
          interestEarned: "500000000",
          usdValue: 30,
          interestEarnedUsd: 50,
        },
      ]);

      expect(result.deposits[0].tokens).toBe("0");
      expect(result.deposits[0].usd).toBeNull();
      expect(result.earnings[0].usd).toBe(50);
      expect(result.currentBalanceUsd).toBe(30);
    });

    it("treats an exact match as a real zero principal, not an out-of-range guard", () => {
      // Off-by-one guard: interestEarned === totalTokens is a genuinely (not
      // negatively) exhausted principal -- the comparison is strictly
      // greater-than, so this must NOT trip the same guard as an actual
      // over-withdrawal. usdValue/interestEarnedUsd are untouched here, so a
      // real (non-null) usd figure proves the guard did not fire.
      const result = summary(USDC_SAC, [
        { ...usdcSupply, totalTokens: "1234000", interestEarned: "1234000" },
      ]);

      expect(result.deposits[0].tokens).toBe("0");
      expect(result.deposits[0].usd).not.toBeNull();
    });
  });
});

describe("hasResolvableSupply", () => {
  it("is true when the focused asset matches a supplied row", () => {
    expect(
      hasResolvableSupply({
        position: position([usdcSupply]),
        focusedAssetId: USDC_SAC,
      }),
    ).toBe(true);
  });

  it("is true when no asset was named, falling back to the first row", () => {
    expect(hasResolvableSupply({ position: position([usdcSupply]) })).toBe(
      true,
    );
  });

  it("is false when the focused asset matches nothing", () => {
    expect(
      hasResolvableSupply({
        position: position([usdcSupply]),
        focusedAssetId: XLM_SAC,
      }),
    ).toBe(false);
  });

  it("is false when the position has no supply rows at all", () => {
    expect(hasResolvableSupply({ position: position([]) })).toBe(false);
  });
});
