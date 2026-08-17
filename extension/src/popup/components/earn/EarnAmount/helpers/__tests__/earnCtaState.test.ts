import BigNumber from "bignumber.js";

import { BLEND_DEPOSIT_XLM_FEE_BUFFER } from "@shared/constants/blend";

import {
  getEarnCtaState,
  getMaxDepositAmount,
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

describe("getMaxDepositAmount", () => {
  it("returns the full available balance for a non-XLM asset", () => {
    // The fee comes out of a different balance, so nothing is held back.
    expect(getMaxDepositAmount({ availableBalance: "500", isXlm: false })).toBe(
      "500",
    );
  });

  it("holds back the resource-fee buffer for XLM", () => {
    // getAvailableBalance only nets out the inclusion fee (~0.00001 XLM); the
    // resource fee is ~0.0546 XLM and would otherwise blow the simulation.
    expect(getMaxDepositAmount({ availableBalance: "100", isXlm: true })).toBe(
      new BigNumber(100).minus(BLEND_DEPOSIT_XLM_FEE_BUFFER).toFixed(),
    );
  });

  it("floors at zero rather than going negative", () => {
    expect(getMaxDepositAmount({ availableBalance: "0.1", isXlm: true })).toBe(
      "0",
    );
  });

  it("returns zero when the buffer exactly consumes the balance", () => {
    expect(
      getMaxDepositAmount({
        availableBalance: BLEND_DEPOSIT_XLM_FEE_BUFFER,
        isXlm: true,
      }),
    ).toBe("0");
  });

  it("does not lose precision on a large balance", () => {
    expect(
      getMaxDepositAmount({ availableBalance: "1691.6912345", isXlm: true }),
    ).toBe("1691.1912345");
  });
});
