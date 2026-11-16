/**
 * Theme application (freighter-private#18, #38). The whole UI is themed by the
 * body's `.sds-theme-*` class — SDS's tokens and the Varial palette overrides
 * are both keyed to it — so theming is keeping that class in sync with the
 * user's preference, resolving "system" through `prefers-color-scheme`.
 */

import {
  DEFAULT_THEME_PREFERENCE,
  ThemePreference,
  coerceThemePreference,
  isThemePreference,
} from "@shared/constants/theme";

/** Same query the OS exposes to stylesheets; shared with tests. */
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/**
 * Synchronous copy of the preference stored in chrome.storage (the source of
 * truth). chrome.storage is async, so this copy is what lets the first paint
 * use the right theme. Shared by popup, side panel and fullscreen, which are
 * the same extension origin.
 */
export const THEME_PREFERENCE_MIRROR_KEY = "themePreference";

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
 * than the media query, so it reflects a pinned light/dark preference too.
 */
export const getAppliedColorScheme = (): ColorScheme =>
  document.body.classList.contains(THEME_CLASS.dark) ? "dark" : "light";

let currentPreference: ThemePreference = "system";
const listeners = new Set<() => void>();

export const getThemePreferenceInEffect = (): ThemePreference =>
  currentPreference;

/** Shaped for React's useSyncExternalStore; returns an unsubscribe. */
export const subscribeToThemePreference = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const updatePreference = (preference: ThemePreference) => {
  const changed = preference !== currentPreference;
  currentPreference = preference;
  applyColorScheme();
  if (changed) {
    listeners.forEach((listener) => listener());
  }
};

const resolveColorScheme = (preference: ThemePreference): ColorScheme =>
  preference === "system" ? getSystemColorScheme() : preference;

const applyColorScheme = () => {
  const scheme = resolveColorScheme(currentPreference);
  document.body.classList.remove(THEME_CLASS.dark, THEME_CLASS.light);
  document.body.classList.add(THEME_CLASS[scheme]);
};

// localStorage can throw (e.g. storage disabled); theming must never break the
// app, so failures count as no mirror.
const readMirror = (): ThemePreference | null => {
  try {
    const value = window.localStorage.getItem(THEME_PREFERENCE_MIRROR_KEY);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
};

const writeMirror = (preference: ThemePreference) => {
  try {
    window.localStorage.setItem(THEME_PREFERENCE_MIRROR_KEY, preference);
  } catch {
    // A stale mirror would be trusted at startup; with none, startup asks
    // chrome.storage instead.
    try {
      window.localStorage.removeItem(THEME_PREFERENCE_MIRROR_KEY);
    } catch {
      // Storage is unusable; every startup will ask chrome.storage.
    }
  }
};

/**
 * Applies a preference to this page and mirrors it so the next page load (and
 * any other open extension page) picks it up. Does not persist it to
 * chrome.storage — see popup/helpers/themePreference.
 */
export const setThemePreference = (preference: ThemePreference) => {
  writeMirror(preference);
  updatePreference(preference);
};

/**
 * Applies the mirrored preference now and keeps the theme current for the
 * lifetime of the page: live system-theme changes (only visible while the
 * preference is "system") and changes made in another open extension page.
 * Returns false when there is no valid mirror, i.e. when chrome.storage may
 * hold a choice this page doesn't know about.
 */
export const initColorScheme = (): boolean => {
  const mirrored = readMirror();
  currentPreference = mirrored ?? DEFAULT_THEME_PREFERENCE;
  applyColorScheme();

  // Re-resolves rather than reading the event, so the initial and live paths
  // can't drift apart; a pinned preference resolves the same either way.
  window.matchMedia?.(DARK_SCHEME_QUERY)?.addEventListener?.("change", () => {
    applyColorScheme();
  });

  // The storage event fires only in *other* same-origin documents, e.g. the
  // side panel when the choice is made in the popup.
  window.addEventListener("storage", (e) => {
    if (e.key !== THEME_PREFERENCE_MIRROR_KEY) {
      return;
    }
    updatePreference(coerceThemePreference(e.newValue));
  });

  return mirrored !== null;
};
