import React from "react";

/**
 * The empty state's sparkle (Figma Varial 4464:110306, "Group 19"). Inlined
 * with `currentColor` rather than shipped as the exported file, whose fill is
 * light-theme only: the colour comes from the stylesheet, so dark mode gets
 * its own. Path and drop shadow as exported.
 */
export const SparkleIcon = () => (
  <svg
    className="PositionIcons__sparkle"
    width="29.6829"
    height="30.8411"
    viewBox="0 0 29.6829 30.8411"
    fill="none"
    aria-hidden="true"
  >
    <g filter="url(#positions-sparkle-shadow)">
      <path
        d="M14.4379 1.39305C14.5244 1.08035 15.0299 1.08035 15.1201 1.39305C16.6594 6.72897 20.1015 10.1509 25.4464 11.6587C25.7596 11.747 25.7626 12.2525 25.4504 12.3409C20.1233 13.8487 16.7215 17.2706 15.245 22.6065C15.1585 22.9192 14.653 22.9192 14.5628 22.6065C13.0235 17.2706 9.58143 13.8487 4.23654 12.3409C3.92332 12.2525 3.92034 11.747 4.23253 11.6587C9.55966 10.1509 12.9615 6.72897 14.4379 1.39305Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <filter
        id="positions-sparkle-shadow"
        x="0"
        y="0"
        width="29.6829"
        height="30.8411"
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feDropShadow
          dx="0"
          dy="4"
          stdDeviation="2"
          floodColor="currentColor"
          floodOpacity="0.25"
        />
      </filter>
    </defs>
  </svg>
);

/**
 * The leaf badged onto the token in "Your earnings" (Figma Varial 4470:113055,
 * "earn"). Inlined with `currentColor` for the same reason as SparkleIcon.
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
