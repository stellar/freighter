import { fitFontSizePx, getAvailableBalanceFontSizePx } from "../fontScale";

describe("fitFontSizePx", () => {
  const scale = [
    { maxLen: 5, sizePx: 20 },
    { maxLen: 10, sizePx: 16 },
    { maxLen: Infinity, sizePx: 12 },
  ];

  it("returns the first step whose maxLen covers the value length", () => {
    expect(fitFontSizePx("abc", scale)).toBe(20); // len 3 <= 5
    expect(fitFontSizePx("abcde", scale)).toBe(20); // len 5 == 5 (boundary)
    expect(fitFontSizePx("abcdef", scale)).toBe(16); // len 6 -> next step
    expect(fitFontSizePx("x".repeat(50), scale)).toBe(12); // catch-all
  });

  it("uses the first step for the empty string", () => {
    expect(fitFontSizePx("", scale)).toBe(20);
  });
});

describe("getAvailableBalanceFontSizePx", () => {
  it("shrinks as the text gets longer", () => {
    expect(getAvailableBalanceFontSizePx("100 XLM available")).toBe(14);
    expect(getAvailableBalanceFontSizePx("x".repeat(35))).toBe(12);
    expect(getAvailableBalanceFontSizePx("x".repeat(60))).toBe(11);
  });
});
