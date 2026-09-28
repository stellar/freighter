import { TokenPriceHistoryRange } from "@shared/api/types";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

/** SVG viewBox geometry; the rendered element scales to the popup width. */
export const CHART_VIEWBOX_WIDTH = 320;
/** Radius of the dot on the latest point, in viewBox units (≈px). */
export const END_DOT_RADIUS = 3;
export const CHART_VIEWBOX_HEIGHT = 140;
/** Vertical inset so the line and end-dot never clip at the extremes. */
export const CHART_VERTICAL_PADDING = 8;

/** Drag-to-inspect (Phase 3): background ring around the inspected dot. */
export const INSPECT_DOT_RING_WIDTH = 2;
/**
 * Radius of the dot on the inspected point, in viewBox units (≈px): Figma's
 * 8px inspected dot. Deliberately distinct from `END_DOT_RADIUS` — the end dot
 * is 6px — so a change to one never silently resizes the other.
 */
export const INSPECT_DOT_RADIUS = 4;
/** Left of this fraction of the width the tooltip flips to the guide's right. */
export const INSPECT_TOOLTIP_FLIP_RATIO = 0.3;
/**
 * Client pixels. Below this a press is a tap, not a drag — keeps `brushed`
 * meaning "the user swept", not "a finger jittered".
 */
export const INSPECT_MOVE_THRESHOLD_PX = 4;
/**
 * Rendered height of the inspect tooltip pill, in px: 18px line-height
 * (Text/XS/600) plus 8px top/bottom padding, twice — 18 + 2 * 8 = 34. Keep
 * this in step with `.LineChart__tooltip` in styles.scss; it is used to
 * vertically centre the pill on the inspected dot.
 */
export const INSPECT_TOOLTIP_HEIGHT_PX = 34;

/** Rendered height of the chart area — shared by the skeleton, the empty
 * placeholder, and the drawn chart so state changes never shift layout. */
export const CHART_HEIGHT_PX = 140;

/** Debounce for timeframe switches (§7): rapid exploratory tapping coalesces
 * into one fetch; the hook's race guard covers whatever still overlaps. */
export const RANGE_SWITCH_DEBOUNCE_MS = 250;

/** Matches mobile. Skipped when the user prefers reduced motion. */
export const CHART_MORPH_DURATION_MS = 250;

/**
 * Below ~33% of expected points the chart shows the limited-data notice.
 * Starting point (raised from 25% in review); tune once analytics are live.
 */
export const SPARSE_COVERAGE_RATIO = 0.33;

/**
 * Expected points per range at full coverage, from the upstream resolutions
 * measured in the design doc.
 */
export const EXPECTED_POINTS_BY_RANGE: Record<string, number> = {
  [TokenPriceHistoryRange.OneHour]: 12,
  [TokenPriceHistoryRange.OneDay]: 97,
  [TokenPriceHistoryRange.OneWeek]: 169,
  [TokenPriceHistoryRange.OneMonth]: 180,
  [TokenPriceHistoryRange.OneYear]: 122,
  [TokenPriceHistoryRange.All]: 277,
};

/**
 * Sign of `change.percent`, falling back to `change.absolute` when the percent
 * rounds to zero. Colours the delta text and the artwork together. Flat, or
 * no `change`, is neutral — unlike `getPriceDeltaColor`, which paints a flat
 * zero negative.
 */
export enum PriceDirection {
  Positive = "positive",
  Negative = "negative",
  Neutral = "neutral",
}

/** Selector order — the closed §6.1 range enum, API spelling. */
export const TIMEFRAME_ORDER = [
  TokenPriceHistoryRange.OneHour,
  TokenPriceHistoryRange.OneDay,
  TokenPriceHistoryRange.OneWeek,
  TokenPriceHistoryRange.OneMonth,
  TokenPriceHistoryRange.OneYear,
  TokenPriceHistoryRange.All,
] as const;

/** Mirrors mobile's `priceHistoryChart` helpers. */
/** Below this, fixed decimals collapse a price to "$0.00". */
export const SUB_CENT_THRESHOLD = 0.01;
/** Significant digits kept for sub-cent magnitudes. */
export const SUB_CENT_SIGNIFICANT_DIGITS = 2;
/** Floor for sub-dollar labels — USD is conventionally two decimals. */
export const MIN_PRICE_DECIMALS = 2;
/** Ceiling in [$0.01, $1): enough to separate a day's high from its low. */
export const MAX_SUB_DOLLAR_DECIMALS = 4;
/** Hard ceiling below a cent, so a dust price can't render 30 digits. */
export const MAX_PRICE_DECIMALS = 8;
