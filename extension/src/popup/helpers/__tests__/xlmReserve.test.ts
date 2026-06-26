import {
  deductNewTrustlineReserve,
  shouldShowXlmReservePreflight,
} from "../xlmReserve";

describe("shouldShowXlmReservePreflight", () => {
  it("returns false when the destination is not new", () => {
    expect(
      shouldShowXlmReservePreflight({
        requiresTrustline: false,
        sourceIsXlm: true,
        spendableXlm: "0",
      }),
    ).toBe(false);
  });

  describe("XLM source (gate on < 0.5)", () => {
    it("shows when spendable XLM is below the base reserve", () => {
      expect(
        shouldShowXlmReservePreflight({
          requiresTrustline: true,
          sourceIsXlm: true,
          spendableXlm: "0.4",
        }),
      ).toBe(true);
    });
    it("does not show at exactly the base reserve", () => {
      expect(
        shouldShowXlmReservePreflight({
          requiresTrustline: true,
          sourceIsXlm: true,
          spendableXlm: "0.5",
        }),
      ).toBe(false);
    });
  });

  describe("non-XLM source (gate on <= 0.5)", () => {
    it("shows when XLM headroom is at or below the base reserve", () => {
      expect(
        shouldShowXlmReservePreflight({
          requiresTrustline: true,
          sourceIsXlm: false,
          spendableXlm: "0.5",
        }),
      ).toBe(true);
    });
    it("does not show with headroom above the base reserve", () => {
      expect(
        shouldShowXlmReservePreflight({
          requiresTrustline: true,
          sourceIsXlm: false,
          spendableXlm: "0.6",
        }),
      ).toBe(false);
    });
  });
});

describe("deductNewTrustlineReserve", () => {
  it("deducts 0.5 XLM when swapping XLM into a new token with spendable >= 0.5", () => {
    expect(
      deductNewTrustlineReserve({
        spendable: "10",
        sourceIsXlm: true,
        requiresTrustline: true,
      }),
    ).toBe("9.5");
  });

  it("deducts down to zero at exactly the base reserve", () => {
    expect(
      deductNewTrustlineReserve({
        spendable: "0.5",
        sourceIsXlm: true,
        requiresTrustline: true,
      }),
    ).toBe("0");
  });

  it("leaves spendable untouched below the base reserve (sheet handles it)", () => {
    expect(
      deductNewTrustlineReserve({
        spendable: "0.4",
        sourceIsXlm: true,
        requiresTrustline: true,
      }),
    ).toBe("0.4");
  });

  it("does not deduct when the destination needs no trustline", () => {
    expect(
      deductNewTrustlineReserve({
        spendable: "10",
        sourceIsXlm: true,
        requiresTrustline: false,
      }),
    ).toBe("10");
  });

  it("does not deduct when the source is not XLM (reserve comes from XLM balance)", () => {
    expect(
      deductNewTrustlineReserve({
        spendable: "10",
        sourceIsXlm: false,
        requiresTrustline: true,
      }),
    ).toBe("10");
  });
});
