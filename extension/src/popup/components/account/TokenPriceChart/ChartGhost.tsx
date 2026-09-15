import React from "react";

import { CHART_VIEWBOX_HEIGHT, CHART_VIEWBOX_WIDTH } from "./constants";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

/** Decorative only — hidden from the accessibility tree. */
const GHOST_POINTS: readonly [number, number][] = [
  [0, 96],
  [20, 105],
  [40, 90],
  [60, 97],
  [80, 75],
  [100, 82],
  [120, 60],
  [140, 70],
  [160, 55],
  [180, 64],
  [200, 43],
  [220, 53],
  [240, 25],
  [260, 35],
  [280, 18],
  [300, 28],
  [320, 14],
];

const GHOST_LINE = GHOST_POINTS.map(([x, y]) => `${x},${y}`).join(" ");
const GHOST_FILL = `${GHOST_LINE} ${CHART_VIEWBOX_WIDTH},${CHART_VIEWBOX_HEIGHT} 0,${CHART_VIEWBOX_HEIGHT}`;

const GRADIENT_ID = "TokenPriceChart__ghost-gradient";

/**
 * Loading-state ghost (Figma "Data loading"): the chart's artwork with no axis
 * labels, no end dot and no animation. `TokenPriceChart__loading` announces.
 */
export const ChartGhost = () => (
  <svg
    className="TokenPriceChart__ghost"
    viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_VIEWBOX_HEIGHT}`}
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
    data-testid="TokenPriceChart__ghost"
  >
    <defs>
      <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <polygon points={GHOST_FILL} fill={`url(#${GRADIENT_ID})`} stroke="none" />
    <polyline
      points={GHOST_LINE}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);
