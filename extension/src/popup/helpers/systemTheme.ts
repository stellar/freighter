/**
 * System-theme following (freighter-private#18). The whole UI is themed by the
 * body's `.sds-theme-*` class — SDS's tokens and the Varial palette overrides
 * are both keyed to it — so following the device theme is just keeping that
 * class in sync with `prefers-color-scheme`.
 */

/** Same query the OS exposes to stylesheets; shared with tests. */
export const LIGHT_SCHEME_QUERY = "(prefers-color-scheme: light)";

export type ColorScheme = "dark" | "light";

const THEME_CLASS: Record<ColorScheme, string> = {
  dark: "sds-theme-dark",
  light: "sds-theme-light",
};

/**
 * The device scheme. Queried as explicit-light so that anything short of a
 * light preference — including no matchMedia or an unsupported query, which
 * report false — resolves dark, matching the static fallback in index.html.
 */
export const getSystemColorScheme = (): ColorScheme =>
  window.matchMedia?.(LIGHT_SCHEME_QUERY)?.matches ? "light" : "dark";

/**
 * The scheme the UI is actually rendering, read from the body class rather
 * than the media query: #38's manual override will set the class without the
 * device preference changing, and metrics report what the user sees.
 */
export const getAppliedColorScheme = (): ColorScheme =>
  document.body.classList.contains(THEME_CLASS.light) ? "light" : "dark";

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
  window.matchMedia?.(LIGHT_SCHEME_QUERY)?.addEventListener?.("change", () => {
    applyColorScheme(getSystemColorScheme());
  });
};
