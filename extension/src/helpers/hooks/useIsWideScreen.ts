import { useEffect, useState } from "react";

/**
 * Reactively tracks whether the viewport meets a minimum width threshold.
 * Updates automatically when the browser window is resized across the breakpoint.
 *
 * @param minWidth - Minimum viewport width in pixels (default: 780 to accomodate full Contract ID display in Sign Transaction flow)
 * @returns `true` when the viewport is at or above `minWidth`, `false` otherwise
 */
export const useIsWideScreen = (minWidth = 780) => {
  const query = `(min-width: ${minWidth}px)`;
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
};
