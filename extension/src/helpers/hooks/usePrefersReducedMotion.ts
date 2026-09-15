import { useEffect, useState } from "react";

/** Same query the stylesheets use; JS-driven animations must check it themselves. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Subscribes to changes: the preference can be toggled while the popup is open. */
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
};
