import {
  getEarnCtaState,
  getXlmFeeShortfall,
  isInsufficientBalanceFailure,
  needsXlmForFee,
} from "../earnCtaState";

const inputs = (overrides = {}) => ({
  availableBalanceIsZero: false,
  amountIsZero: false,
  isAmountTooHigh: false,
  ...overrides,
});

describe("getEarnCtaState", () => {
  it("is enabled and offers review for a valid amount", () => {
    expect(getEarnCtaState(inputs())).toEqual({
      disabled: false,
      labelKey: "review",
    });
  });

  it("asks for an amount when none is entered", () => {
    expect(getEarnCtaState(inputs({ amountIsZero: true }))).toEqual({
      disabled: true,
      labelKey: "enter",
    });
  });

  it("reports insufficient funds when the amount exceeds the balance", () => {
    expect(getEarnCtaState(inputs({ isAmountTooHigh: true }))).toEqual({
      disabled: true,
      labelKey: "insufficient",
    });
  });

  it("reports insufficient funds ahead of asking for an amount", () => {
    // With nothing spendable, prompting for an amount would invite an entry
    // that can never be valid.
    expect(
      getEarnCtaState(
        inputs({ availableBalanceIsZero: true, amountIsZero: true }),
      ),
    ).toEqual({ disabled: true, labelKey: "insufficient" });
  });

  it("never enables the CTA while any blocker is present", () => {
    const blockers = [
      { availableBalanceIsZero: true },
      { amountIsZero: true },
      { isAmountTooHigh: true },
    ];

    blockers.forEach((blocker) => {
      expect(getEarnCtaState(inputs(blocker)).disabled).toBe(true);
    });
  });
});

describe("needsXlmForFee", () => {
  it("is true when spendable XLM is below the fee", () => {
    expect(needsXlmForFee({ spendableXlm: "0.001", fee: "0.06" })).toBe(true);
  });

  it("is false when spendable XLM covers the fee", () => {
    expect(needsXlmForFee({ spendableXlm: "1", fee: "0.06" })).toBe(false);
  });

  it("is false when spendable XLM exactly equals the fee", () => {
    expect(needsXlmForFee({ spendableXlm: "0.06", fee: "0.06" })).toBe(false);
  });

  it("is true for an account with no spendable XLM at all", () => {
    expect(needsXlmForFee({ spendableXlm: "0", fee: "0.0000100" })).toBe(true);
  });
});

describe("getXlmFeeShortfall", () => {
  it("is zero when the deposit leaves more than the resource fee", () => {
    expect(
      getXlmFeeShortfall({
        spendableXlm: "100",
        amount: "50",
        resourceFee: "0.0546395",
      }),
    ).toBe("0");
  });

  it("reports the shortfall when the whole spendable balance is deposited", () => {
    // The full balance is depositable — nothing is held back — so the entire
    // resource fee is missing.
    expect(
      getXlmFeeShortfall({
        spendableXlm: "100",
        amount: "100",
        resourceFee: "0.0546395",
      }),
    ).toBe("0.0546395");
  });

  it("reports only the part of the fee that is not covered", () => {
    expect(
      getXlmFeeShortfall({
        spendableXlm: "100",
        amount: "99.99",
        resourceFee: "0.0546395",
      }),
    ).toBe("0.0446395");
  });

  it("is zero when the remainder exactly covers the fee", () => {
    expect(
      getXlmFeeShortfall({
        spendableXlm: "100",
        amount: "99.9453605",
        resourceFee: "0.0546395",
      }),
    ).toBe("0");
  });

  it("does not lose precision on a large balance", () => {
    expect(
      getXlmFeeShortfall({
        spendableXlm: "1691.6912345",
        amount: "1691.6912345",
        resourceFee: "0.0546395",
      }),
    ).toBe("0.0546395");
  });
});

describe("isInsufficientBalanceFailure", () => {
  it("matches the asset contract's BalanceError", () => {
    expect(
      isInsufficientBalanceFailure(
        "host invocation failed: HostError: Error(Contract, #10)",
      ),
    ).toBe(true);
  });

  it("matches a classic insufficient-balance result code", () => {
    expect(isInsufficientBalanceFailure("tx_insufficient_balance")).toBe(true);
    expect(isInsufficientBalanceFailure("txINSUFFICIENT_BALANCE")).toBe(true);
  });

  it("leaves the pool's own rejections alone", () => {
    // Supply cap, frozen pool, stale oracle — these must keep surfacing their
    // own message rather than being retold as a fee problem.
    expect(
      isInsufficientBalanceFailure("HostError: Error(Contract, #1206)"),
    ).toBe(false);
    expect(isInsufficientBalanceFailure("pool is frozen")).toBe(false);
  });
});
