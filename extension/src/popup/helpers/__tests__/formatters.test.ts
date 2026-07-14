import BigNumber from "bignumber.js";
import {
  formatAmountPreserveCursor,
  getValidBigNumber,
  isValidPositiveAmount,
  normalizeNumericString,
  trimTrailingZeros,
} from "../formatters";

describe("normalizeNumericString", () => {
  it("strips non-numeric characters", () => {
    expect(normalizeNumericString("1a2b3")).toBe("123");
    expect(normalizeNumericString("abc")).toBe("");
    expect(normalizeNumericString("$1,234.56")).toBe("1234.56");
  });

  it("keeps a single decimal point and drops subsequent ones", () => {
    expect(normalizeNumericString("1.2.3")).toBe("1.23");
    expect(normalizeNumericString("1..2")).toBe("1.2");
    expect(normalizeNumericString("1.2.3.4")).toBe("1.234");
  });

  it("handles values starting or ending with a decimal", () => {
    expect(normalizeNumericString(".5")).toBe(".5");
    expect(normalizeNumericString("5.")).toBe("5.");
  });

  it("preserves a single valid decimal value unchanged", () => {
    expect(normalizeNumericString("123.456")).toBe("123.456");
    expect(normalizeNumericString("0")).toBe("0");
    expect(normalizeNumericString("")).toBe("");
  });
});

describe("getValidBigNumber", () => {
  it("returns null for empty or decimal-only inputs", () => {
    expect(getValidBigNumber("")).toBeNull();
    expect(getValidBigNumber(".")).toBeNull();
    expect(getValidBigNumber("abc")).toBeNull();
  });

  it("returns a BigNumber for valid numeric strings", () => {
    const result = getValidBigNumber("1.5");
    expect(result).toBeInstanceOf(BigNumber);
    expect(result?.toString()).toBe("1.5");
  });

  it("normalizes multi-decimal input before parsing", () => {
    // "1.2.3" normalizes to "1.23"
    expect(getValidBigNumber("1.2.3")?.toString()).toBe("1.23");
  });

  it("returns BigNumber(0) for zero input", () => {
    expect(getValidBigNumber("0")?.toString()).toBe("0");
  });

  it("returns a BigNumber for negative-like input by stripping the sign", () => {
    // cleanAmount strips "-", so "-5" becomes "5"
    expect(getValidBigNumber("-5")?.toString()).toBe("5");
  });
});

describe("isValidPositiveAmount", () => {
  it("returns false for empty, decimal-only, or non-numeric input", () => {
    expect(isValidPositiveAmount("")).toBe(false);
    expect(isValidPositiveAmount(".")).toBe(false);
    expect(isValidPositiveAmount("abc")).toBe(false);
  });

  it("returns false for zero", () => {
    expect(isValidPositiveAmount("0")).toBe(false);
    expect(isValidPositiveAmount("0.00")).toBe(false);
  });

  it("returns true for positive amounts", () => {
    expect(isValidPositiveAmount("1")).toBe(true);
    expect(isValidPositiveAmount("0.00001")).toBe(true);
    expect(isValidPositiveAmount("1000000")).toBe(true);
  });

  it("returns true after normalizing multi-decimal input", () => {
    // "1.2.3" → "1.23" → > 0
    expect(isValidPositiveAmount("1.2.3")).toBe(true);
  });
});

describe("trimTrailingZeros", () => {
  it("removes trailing zeros from decimal numbers", () => {
    expect(trimTrailingZeros("1.5000")).toBe("1.5");
    expect(trimTrailingZeros("3.14000")).toBe("3.14");
    expect(trimTrailingZeros("0.1230000")).toBe("0.123");
  });

  it("removes decimal point when all decimals are zeros", () => {
    expect(trimTrailingZeros("100.0000")).toBe("100");
    expect(trimTrailingZeros("42.0")).toBe("42");
    expect(trimTrailingZeros("1.0")).toBe("1");
  });

  it("returns number unchanged when no decimal point", () => {
    expect(trimTrailingZeros("100")).toBe("100");
    expect(trimTrailingZeros("42")).toBe("42");
    expect(trimTrailingZeros("0")).toBe("0");
  });

  it("handles numbers with no trailing zeros", () => {
    expect(trimTrailingZeros("1.234")).toBe("1.234");
    expect(trimTrailingZeros("0.5")).toBe("0.5");
    expect(trimTrailingZeros("999.999")).toBe("999.999");
  });

  it("handles edge cases", () => {
    expect(trimTrailingZeros("")).toBe("");
    expect(trimTrailingZeros(".5000")).toBe(".5");
    expect(trimTrailingZeros("0.0")).toBe("0");
    expect(trimTrailingZeros(".0")).toBe("");
  });

  it("handles single decimal digit", () => {
    expect(trimTrailingZeros("5.0")).toBe("5");
    expect(trimTrailingZeros("5.1")).toBe("5.1");
  });

  it("handles already trimmed numbers", () => {
    expect(trimTrailingZeros("123.456")).toBe("123.456");
    expect(trimTrailingZeros("0.1")).toBe("0.1");
    expect(trimTrailingZeros("999")).toBe("999");
  });

  it("handles very small decimal numbers", () => {
    expect(trimTrailingZeros("0.0001000")).toBe("0.0001");
    expect(trimTrailingZeros("0.00010")).toBe("0.0001");
  });

  it("handles large numbers with decimals", () => {
    expect(trimTrailingZeros("1234567.89000")).toBe("1234567.89");
    expect(trimTrailingZeros("1000000.0000")).toBe("1000000");
  });
});

describe("formatAmountPreserveCursor", () => {
  it("returns an empty amount for a fully-cleared field (not '0')", () => {
    // Erasing every digit must stay empty so the input can show its placeholder
    // or just the "$" prefix, rather than snapping back to a non-erasable "0".
    expect(formatAmountPreserveCursor("", "12").amount).toBe("");
    expect(formatAmountPreserveCursor("", "1.23").amount).toBe("");
  });

  it("still formats a non-empty amount", () => {
    expect(formatAmountPreserveCursor("12", "1").amount).toBe("12");
    expect(formatAmountPreserveCursor("1.23", "1.2", 2).amount).toBe("1.23");
  });
});
