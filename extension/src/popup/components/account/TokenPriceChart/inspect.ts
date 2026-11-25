import BigNumber from "bignumber.js";

import { ApiTokenPriceHistoryPoint } from "@shared/api/types";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md
// Mirrors mobile's `nearestCoordinateIndex` / `computeInspectedChange` in
// `helpers/priceHistoryChart.ts` — the two must agree byte-for-byte.

/** Same shape as the server's `change`, so the header formats it identically. */
export interface InspectedChange {
  absolute: string;
  percent: string;
}

/**
 * Index of the plotted x nearest to `x` — the drag-to-inspect SNAP (Phase 3).
 * `xs` is ascending but not strictly (the clock-skew clamp can stack points
 * on one x). Ties and duplicates resolve to the LATER index. -1 when empty.
 */
export const nearestCoordinateIndex = (xs: number[], x: number): number => {
  if (xs.length === 0) {
    return -1;
  }
  let low = 0;
  let high = xs.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (xs[mid] < x) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  let best = low;
  const previous = low - 1;
  if (previous >= 0 && x - xs[previous] < xs[low] - x) {
    best = previous;
  }
  while (best + 1 < xs.length && xs[best + 1] === xs[best]) {
    best += 1;
  }
  return best;
};

/**
 * The one client-side delta (D8 exception): close-to-close from the first
 * plotted point to the inspected one. Percent rounded to 2dp like the server;
 * a zero start reports "0.00" instead of dividing by zero.
 */
export const computeInspectedChange = (
  from: ApiTokenPriceHistoryPoint,
  to: ApiTokenPriceHistoryPoint,
): InspectedChange => {
  const start = new BigNumber(from.p);
  const absolute = new BigNumber(to.p).minus(start);
  const percent = start.isZero()
    ? new BigNumber(0)
    : absolute.div(start).times(100);
  return { absolute: absolute.toFixed(), percent: percent.toFixed(2) };
};
