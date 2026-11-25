import browser from "webextension-polyfill";
import {
  ThemePreference,
  coerceThemePreference,
} from "@shared/constants/theme";
import { saveThemePreference } from "@shared/api/internal";
import { THEME_PREFERENCE_ID } from "constants/localStorageTypes";
import { syncPreferredThemeTrait } from "helpers/metrics";
import { emitThemeChanged } from "popup/metrics/theme";
import {
  getColorSchemeInEffect,
  getThemePreferenceInEffect,
  setThemePreference,
  subscribeToThemePreference,
  trackUnsavedPick,
} from "popup/helpers/systemTheme";

/**
 * Loads the saved choice at startup. Reads chrome.storage directly rather than
 * through the background: waking a stopped service worker can take longer
 * than the first paint. Best-effort: on error the page stays on the default.
 */
export const syncThemePreferenceFromStorage = async (): Promise<void> => {
  // A change made while the read is in flight is newer than the stored value,
  // so the read must not overwrite it.
  let changedMeanwhile = false;
  const unsubscribe = subscribeToThemePreference(() => {
    changedMeanwhile = true;
  });
  try {
    const stored = coerceThemePreference(
      (await browser.storage.local.get(THEME_PREFERENCE_ID))[
        THEME_PREFERENCE_ID
      ],
    );
    if (!changedMeanwhile && stored !== getThemePreferenceInEffect()) {
      setThemePreference(stored);
      syncPreferredThemeTrait(stored);
    }
  } catch {
    // Stay on the current preference.
  } finally {
    unsubscribe();
  }
};

/**
 * Handles a pick in the theme picker: fades to it immediately, persists it to
 * chrome.storage, then reports it. Resolves true once saved, false when the
 * pick was already in effect. Throws if the save fails, in which case nothing
 * is reported.
 */
export const selectThemePreference = async (
  preference: ThemePreference,
): Promise<boolean> => {
  const previous = getThemePreferenceInEffect();
  if (preference === previous) {
    return false;
  }
  setThemePreference(preference, { fade: true });
  // Captured now: a quicker second pick can change the page before this
  // save resolves.
  const colorScheme = getColorSchemeInEffect();

  await trackUnsavedPick(preference, saveThemePreference(preference));

  emitThemeChanged({ preference, previous, colorScheme });
  // A newer pick, here or in another open page, has replaced this one and
  // reports its own value; this late save must not overwrite it.
  if (preference === getThemePreferenceInEffect()) {
    syncPreferredThemeTrait(preference, { force: true });
  }
  return true;
};
