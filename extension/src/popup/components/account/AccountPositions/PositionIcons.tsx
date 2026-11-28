import React from "react";

/**
 * The leaf badged onto the token in "Your earnings" (Figma Varial 4470:113055,
 * "earn"). Inlined with `currentColor` rather than shipped as the exported
 * file, whose stroke is light-theme only: the colour comes from the
 * stylesheet, so dark mode gets its own. Path as exported.
 */
export const EarnLeafIcon = () => (
  <svg
    className="PositionIcons__leaf"
    width="7.5"
    height="7.5"
    viewBox="0 0 7.5 7.5"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3.60776 6.5V5.05461M3.60776 5.05461C3.60776 5.05461 3.74502 4.48124 4.04618 3.96092M3.60776 5.05461C3.52405 4.9368 3.39658 4.71646 3.28088 4.5552M4.04618 3.96092C4.04618 3.96092 3.99976 2.67031 4.31324 2.09169C4.81666 1.16247 6.45844 1 6.45844 1C6.45844 1 6.66572 2.47678 6.15446 3.18106C5.58864 3.96049 4.04618 3.96092 4.04618 3.96092ZM3.28088 4.5552C3.28088 4.5552 3.39633 3.20288 2.72837 2.47213C2.20282 1.89717 1.04292 2.09169 1.04292 2.09169C1.04292 2.09169 0.801975 3.31736 1.46183 4.03605C2.12169 4.75475 3.28088 4.5552 3.28088 4.5552Z"
      stroke="currentColor"
      strokeLinecap="round"
    />
  </svg>
);
