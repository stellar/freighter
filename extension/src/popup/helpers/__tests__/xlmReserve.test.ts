import { shouldShowXlmReservePreflight } from "../xlmReserve";

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
