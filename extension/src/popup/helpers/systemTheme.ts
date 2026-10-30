/**
 * System-theme following (freighter-private#18). The whole UI is themed by the
 * body's `.sds-theme-*` class — SDS's tokens and the Varial palette overrides
 * are both keyed to it — so following the device theme is just keeping that
 * class in sync with `prefers-color-scheme`.
 */

/** Same query the OS exposes to stylesheets; shared with tests. */
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export type ColorScheme = "dark" | "light";

const THEME_CLASS: Record<ColorScheme, string> = {
  dark: "sds-theme-dark",
  light: "sds-theme-light",
};

/**
 * The device scheme. Queried as explicit-dark so that anything short of a
 * dark preference — including no matchMedia or an unsupported query, which
 * report false — resolves light: Varial is light-first, matching mobile's
 * DEFAULT_COLOR_SCHEME and the static fallback in index.html.
 */
export const getSystemColorScheme = (): ColorScheme =>
  window.matchMedia?.(DARK_SCHEME_QUERY)?.matches ? "dark" : "light";

/**
 * The scheme the UI is actually rendering, read from the body class rather
 * than the media query: #38's manual override will set the class without the
 * device preference changing, and metrics report what the user sees.
 */
export const getAppliedColorScheme = (): ColorScheme =>
  document.body.classList.contains(THEME_CLASS.dark) ? "dark" : "light";

const applyColorScheme = (scheme: ColorScheme) => {
  document.body.classList.remove(THEME_CLASS.dark, THEME_CLASS.light);
  document.body.classList.add(THEME_CLASS[scheme]);
};

/**
 * Applies the device scheme now and keeps following it for the lifetime of
 * the page, including live system-theme changes while the popup is open.
 */
export const followSystemColorScheme = () => {
  applyColorScheme(getSystemColorScheme());
  // The handler re-derives through getSystemColorScheme rather than reading
  // the event, so the initial and live paths can't drift apart.
  window.matchMedia?.(DARK_SCHEME_QUERY)?.addEventListener?.("change", () => {
    applyColorScheme(getSystemColorScheme());
  });
};
