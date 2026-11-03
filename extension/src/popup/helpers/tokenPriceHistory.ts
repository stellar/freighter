import { ApiTokenPriceHistoryPoint } from "@shared/api/types";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

/**
 * Two points is the floor for a line. The `has_data` analytics property, the
 * chart-vs-empty gate and the notice all read this one rule; its value is part
 * of the frozen cross-platform analytics contract.
 */
export const hasChartData = (points: ApiTokenPriceHistoryPoint[]): boolean =>
  points.length >= 2;
