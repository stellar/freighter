import { calculateSwapRate } from "../calculateSwapRate";

describe("calculateSwapRate", () => {
  it("returns destinationAmount / sendAmount formatted", () => {
    expect(
      calculateSwapRate({ sendAmount: "10", destinationAmount: "25" }),
    ).toBe("2.5");
  });

  it("returns 0 when sendAmount is zero", () => {
    expect(
      calculateSwapRate({ sendAmount: "0", destinationAmount: "25" }),
    ).toBe("0");
  });

  it("returns 0 when sendAmount is empty", () => {
    expect(calculateSwapRate({ sendAmount: "", destinationAmount: "25" })).toBe(
      "0",
    );
  });
});
