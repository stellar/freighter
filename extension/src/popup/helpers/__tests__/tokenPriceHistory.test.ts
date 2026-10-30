import { hasChartData } from "popup/helpers/tokenPriceHistory";

const points = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ t: i * 900, p: "1.00" }));

describe("hasChartData", () => {
  it("is false below two points — one point cannot form a line", () => {
    expect(hasChartData([])).toBe(false);
    expect(hasChartData(points(1))).toBe(false);
  });

  it("is true from two points up", () => {
    expect(hasChartData(points(2))).toBe(true);
    expect(hasChartData(points(97))).toBe(true);
  });

  it("keeps the threshold at 2 — it is the frozen has_data contract", () => {
    // The `has_data` analytics property, the chart-vs-empty-state gate, and
    // the notice's no-chart-no-notice rule all read this. Its value is agreed
    // byte-for-byte with mobile; centralising it must never change it.
    expect(points(2).length).toBe(2);
    expect(hasChartData(points(2))).toBe(true);
    expect(hasChartData(points(1))).toBe(false);
  });
});
