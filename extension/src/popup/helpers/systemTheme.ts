/**
 * Theme application (freighter-private#18, #38). The whole UI is themed by the
 * body's `.sds-theme-*` class — SDS's tokens and the Varial palette overrides
 * are both keyed to it — so theming is keeping that class in sync with the
 * user's preference, resolving "system" through `prefers-color-scheme`.
 */

import browser from "webextension-polyfill";
import {
  DEFAULT_THEME_PREFERENCE,
  ThemePreference,
  coerceThemePreference,
} from "@shared/constants/theme";
import { THEME_PREFERENCE_ID } from "constants/localStorageTypes";

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
 * than the media query, so it reflects a pinned light/dark preference too.
 */
export const getAppliedColorScheme = (): ColorScheme =>
  document.body.classList.contains(THEME_CLASS.dark) ? "dark" : "light";

let currentPreference: ThemePreference = DEFAULT_THEME_PREFERENCE;
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

// Picks this page has applied but not yet saved. Their own storage events can
// land after a newer pick, so those events are ignored.
const unsavedPicks: ThemePreference[] = [];

/**
 * Applies a preference to this page only. Persisting it to chrome.storage,
 * which updates the other open pages, is popup/helpers/themePreference's job.
 */
export const setThemePreference = (preference: ThemePreference) => {
  updatePreference(preference);
};

export const trackUnsavedPick = async <T>(
  preference: ThemePreference,
  save: Promise<T>,
): Promise<T> => {
  unsavedPicks.push(preference);
  try {
    return await save;
  } finally {
    unsavedPicks.splice(unsavedPicks.indexOf(preference), 1);
  }
};

/**
 * Applies the default now and keeps the theme current for the lifetime of the
 * page: live system-theme changes (only visible while the preference is
 * "system") and changes saved from another open extension page. The saved
 * choice itself is loaded by popup/helpers/themePreference.
 */
export const initColorScheme = () => {
  applyColorScheme();

  // Re-resolves rather than reading the event, so the initial and live paths
  // can't drift apart; a pinned preference resolves the same either way.
  window.matchMedia?.(DARK_SCHEME_QUERY)?.addEventListener?.("change", () => {
    applyColorScheme();
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !(THEME_PREFERENCE_ID in changes)) {
      return;
    }
    const stored = coerceThemePreference(changes[THEME_PREFERENCE_ID].newValue);
    if (!unsavedPicks.includes(stored)) {
      updatePreference(stored);
    }
  });
};
