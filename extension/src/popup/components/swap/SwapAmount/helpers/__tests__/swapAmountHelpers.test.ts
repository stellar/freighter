import { AMOUNT_ERROR } from "helpers/transaction";
import { validateSwapAmount } from "../swapAmountValidation";
import {
  getAmountFontSizeClass,
  buildFiatLineText,
} from "../swapAmountDisplay";

describe("validateSwapAmount", () => {
  it("returns null for a valid amount", () => {
    expect(validateSwapAmount("10")).toBeNull();
    expect(validateSwapAmount("0.1234567")).toBeNull();
    expect(validateSwapAmount("")).toBeNull();
  });

  it("flags more than 7 decimals", () => {
    expect(validateSwapAmount("0.12345678")).toBe(AMOUNT_ERROR.DEC_MAX);
  });

  it("flags an amount above the max send amount", () => {
    expect(validateSwapAmount("1000000000000")).toBe(AMOUNT_ERROR.SEND_MAX);
  });
});

describe("getAmountFontSizeClass", () => {
  it("sizes by digit count", () => {
    expect(getAmountFontSizeClass("123")).toBe("lg");
    expect(getAmountFontSizeClass("1234567")).toBe("med");
    expect(getAmountFontSizeClass("12345678901")).toBe("small");
    expect(getAmountFontSizeClass("12345678901234")).toBe("xsmall");
  });

  it("ignores non-digits and empty values", () => {
    expect(getAmountFontSizeClass("1,234.56")).toBe("lg");
    expect(getAmountFontSizeClass("")).toBe("lg");
  });
});

describe("buildFiatLineText", () => {
  const base = {
    inputType: "crypto" as const,
    price: "0.5",
    priceUsd: "5.00",
    cryptoAmount: "10",
    code: "XLM",
  };

  it("shows $0.00 when no token is picked", () => {
    expect(buildFiatLineText({ ...base, hasAsset: false })).toBe("$0.00");
  });

  it("shows the USD value in crypto mode", () => {
    expect(buildFiatLineText({ ...base, hasAsset: true })).toBe("$5.00");
  });

  it("shows -- in crypto mode when the token has no price", () => {
    expect(buildFiatLineText({ ...base, hasAsset: true, price: null })).toBe(
      "--",
    );
  });

  it("shows the converted crypto amount in fiat mode", () => {
    expect(
      buildFiatLineText({ ...base, hasAsset: true, inputType: "fiat" }),
    ).toBe("10 XLM");
  });
});
