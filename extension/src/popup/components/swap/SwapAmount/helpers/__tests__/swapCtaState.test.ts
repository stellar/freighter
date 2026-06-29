import { getSwapCtaState, SwapCtaInputs } from "../swapCtaState";

const base: SwapCtaInputs = {
  hasSource: true,
  hasDestination: true,
  availableBalanceIsZero: false,
  amountIsZero: false,
  isAmountTooHigh: false,
  insufficientXlmForFees: false,
  hasNoSwapPath: false,
};

describe("getSwapCtaState", () => {
  it("prompts to select a token (enabled, so it can open the picker) when either side is missing", () => {
    expect(getSwapCtaState({ ...base, hasSource: false })).toEqual({
      disabled: false,
      labelKey: "select",
    });
    expect(getSwapCtaState({ ...base, hasDestination: false })).toEqual({
      disabled: false,
      labelKey: "select",
    });
  });

  it("prompts to enter an amount (enabled, so the tap focuses the sell input) when the amount is zero", () => {
    expect(getSwapCtaState({ ...base, amountIsZero: true })).toEqual({
      disabled: false,
      labelKey: "enter",
    });
  });

  it("flags insufficient balance (disabled) when the spendable balance is zero, even before an amount is entered", () => {
    expect(
      getSwapCtaState({
        ...base,
        availableBalanceIsZero: true,
        amountIsZero: true,
      }),
    ).toEqual({
      disabled: true,
      labelKey: "insufficientBalance",
    });
  });

  it("prefers the zero-balance blocker over the enter state", () => {
    expect(
      getSwapCtaState({
        ...base,
        availableBalanceIsZero: true,
        amountIsZero: true,
      }).labelKey,
    ).toBe("insufficientBalance");
  });

  it("flags insufficient balance over the source spendable", () => {
    expect(getSwapCtaState({ ...base, isAmountTooHigh: true })).toEqual({
      disabled: true,
      labelKey: "insufficientBalance",
    });
  });

  it("flags insufficient XLM for fees (non-XLM source)", () => {
    expect(getSwapCtaState({ ...base, insufficientXlmForFees: true })).toEqual({
      disabled: true,
      labelKey: "insufficientXlmFees",
    });
  });

  it("flags no quote available when the path is empty", () => {
    expect(getSwapCtaState({ ...base, hasNoSwapPath: true })).toEqual({
      disabled: true,
      labelKey: "noQuote",
    });
  });

  it("enables Review swap when everything checks out", () => {
    expect(getSwapCtaState(base)).toEqual({
      disabled: false,
      labelKey: "review",
    });
  });

  it("prefers the source-balance error over the fee error", () => {
    expect(
      getSwapCtaState({
        ...base,
        isAmountTooHigh: true,
        insufficientXlmForFees: true,
      }).labelKey,
    ).toBe("insufficientBalance");
  });
});
