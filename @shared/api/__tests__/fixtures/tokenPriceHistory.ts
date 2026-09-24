import {
  ApiTokenPriceHistory,
  ApiTokenPriceHistoryPoint,
} from "@shared/api/types";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

/**
 * The §6.1 `/token-price-history` payload, in one place.
 *
 * The backend contract is frozen, so every unit test that needs a series
 * should build it from here rather than restating the shape — a redeclared
 * fixture that drifts from the contract makes a test pass against a payload
 * the server never sends.
 *
 * Numbers are strings; no data is a 200 with `points: []` and `change: null`,
 * never a 404; `lowVolume` is `true | false | null`.
 */

/** The §6.1 example's two points verbatim: first close 0.158900, last close
 * 0.160259 — the pair the example's `change` describes. */
export const CANONICAL_POINTS: ApiTokenPriceHistoryPoint[] = [
  { t: 1786636800, p: "0.158900" },
  { t: 1786637700, p: "0.160259" },
];

/**
 * `count` evenly-spaced points. Spacing is a convenience, not a promise:
 * upstream omits untraded buckets, so no production code may assume uniform
 * spacing (§5 fact 3). Tests that care about gaps should write points out.
 */
export const densePoints = (
  count: number,
  {
    startT = 1786636800,
    stepSeconds = 900,
    startPrice = 0.1589,
    priceStep = 0.0001,
  }: {
    startT?: number;
    stepSeconds?: number;
    startPrice?: number;
    priceStep?: number;
  } = {},
): ApiTokenPriceHistoryPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    t: startT + i * stepSeconds,
    p: (startPrice + i * priceStep).toFixed(6),
  }));

/** A §6.1 history payload; override only what the test is about. */
export const makeHistory = (
  overrides: Partial<ApiTokenPriceHistory> = {},
): ApiTokenPriceHistory => ({
  token: "native",
  range: "1D",
  resolutionSeconds: 900,
  currency: "USD",
  lowVolume: false,
  change: { absolute: "0.001359", percent: "0.86" },
  points: CANONICAL_POINTS,
  ...overrides,
});
