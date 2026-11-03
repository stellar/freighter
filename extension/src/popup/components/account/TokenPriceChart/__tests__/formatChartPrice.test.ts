import BigNumber from "bignumber.js";

import { formatChartPrice } from "popup/components/account/TokenPriceChart";

/**
 * Price-label parity with mobile's `formatPriceHistoryLabel`. The chart's
 * high/low axis labels and its absolute delta both read this, so a change
 * here silently desyncs the two platforms' rendering of the same token —
 * these cases are the contract, mirrored by the mobile suite.
 */
describe("formatChartPrice", () => {
  it.each([
    ["0", "0.00"],
    // Sub-cent: two significant digits, padded — never "$0.00" (the collapse
    // that made a micro-priced token's high and low read identically).
    ["0.00001", "0.000010"],
    ["0.000123", "0.00012"],
    ["0.0099", "0.0099"],
    // [$0.01, $1): the value's own decimals, clamped to [2, 4]. Two decimals
    // alone would render XLM's daily high and low both as "0.16".
    ["0.01", "0.01"],
    ["0.0602", "0.0602"],
    ["0.1589", "0.1589"],
    ["0.158900", "0.1589"],
    ["0.86", "0.86"],
    ["0.001359", "0.0014"],
    // >= $1 keeps the popup's standard two decimals with separators.
    ["1.5", "1.50"],
    ["66683", "66,683.00"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatChartPrice(new BigNumber(input))).toBe(expected);
  });

  it("separates a normal XLM day's high from its low", () => {
    // Both collapsed to "0.16" under fixed two-decimal formatting, leaving a
    // chart with real movement labelled with one repeated number.
    const high = formatChartPrice(new BigNumber("0.1596"));
    const low = formatChartPrice(new BigNumber("0.1582"));
    expect(high).not.toBe(low);
    expect([high, low]).toEqual(["0.1596", "0.1582"]);
  });

  it("formats magnitude only — the sign is carried separately", () => {
    expect(formatChartPrice(new BigNumber("-0.0602"))).toBe("0.0602");
  });

  it("keeps every digit of a value above 2^53", () => {
    // `formatAmount` narrows the whole part through Number; 9007199254740993
    // came back as ...992.
    expect(formatChartPrice(new BigNumber("9007199254740993"))).toBe(
      "9,007,199,254,740,993.00",
    );
  });
});
