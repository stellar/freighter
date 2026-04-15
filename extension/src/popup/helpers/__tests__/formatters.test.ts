import { trimTrailingZeros } from "../formatters";

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
