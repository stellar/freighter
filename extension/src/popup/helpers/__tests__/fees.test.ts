import { getCurrentTransactionFee } from "../fees";

describe("getCurrentTransactionFee", () => {
  it("uses the current redux fee when present", () => {
    expect(
      getCurrentTransactionFee({
        currentTransactionFee: "0.00005",
        fallbackTransactionFee: "0.00001",
      }),
    ).toBe("0.00005");
  });

  it("falls back to the previous fee when redux fee is empty", () => {
    expect(
      getCurrentTransactionFee({
        currentTransactionFee: "",
        fallbackTransactionFee: "0.00001",
      }),
    ).toBe("0.00001");
  });

  it("falls back to BASE_FEE when both fees are empty", () => {
    expect(
      getCurrentTransactionFee({
        currentTransactionFee: "",
        fallbackTransactionFee: "",
      }),
    ).toBe("0.00001");
  });
});
