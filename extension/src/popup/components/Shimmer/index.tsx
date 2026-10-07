import React, { useMemo } from "react";

import { usePrefersReducedMotion } from "helpers/hooks/usePrefersReducedMotion";

import "./styles.scss";

/** From the Figma prototype: 1.6 s sweep + 0.3 s hold. Must match the SCSS. */
export const SHIMMER_CYCLE_MS = 1900;

// Every shimmer offsets its animation by the time since this module loaded,
// so pills that mount at different moments still sweep together.
const SHIMMER_EPOCH = performance.now();

export interface ShimmerProps {
  /** Any CSS length, e.g. "9.125rem" or "100%". */
  width: string;
  height: string;
  variant?: "pill" | "hairline";
  className?: string;
  "data-testid"?: string;
}

/**
 * A loading placeholder: a base gradient with a white highlight sweeping
 * across it. Decorative; the element that owns the area announces loading.
 */
export const Shimmer = ({
  width,
  height,
  variant = "pill",
  className,
  "data-testid": testId,
}: ShimmerProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Captured once per mount: the phase this instance joins.
  const delayMs = useMemo(
    () => -((performance.now() - SHIMMER_EPOCH) % SHIMMER_CYCLE_MS),
    [],
  );

  const classes = [
    "Shimmer",
    `Shimmer--${variant}`,
    prefersReducedMotion ? "Shimmer--static" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      aria-hidden="true"
      data-testid={testId}
      style={
        {
          width,
          height,
          "--shimmer-delay": `${delayMs}ms`,
        } as React.CSSProperties
      }
    />
  );
};
