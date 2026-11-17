import { ThemePreference } from "@shared/constants/theme";
import { getThemePreference, saveThemePreference } from "@shared/api/internal";
import { syncPreferredThemeTrait } from "helpers/metrics";
import { emitThemeChanged } from "popup/metrics/theme";
import {
  getAppliedColorScheme,
  getThemePreferenceInEffect,
  setThemePreference,
  subscribeToThemePreference,
} from "popup/helpers/systemTheme";

/**
 * Recovers the saved choice from chrome.storage after the first paint, for
 * pages that started without a localStorage mirror (e.g. cleared site data).
 * Best-effort: on error the page stays on the default.
 */
export const syncThemePreferenceFromStorage = async (): Promise<void> => {
  // A change made while the request is in flight is newer than the stored
  // value the background read, so the reply must not overwrite it.
  let changedMeanwhile = false;
  const unsubscribe = subscribeToThemePreference(() => {
    changedMeanwhile = true;
  });
  try {
    const stored = await getThemePreference();
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
 * Handles a pick in the theme picker: applies it immediately, persists it to
 * chrome.storage, then reports it. Throws if the save fails, in which case
 * nothing is reported.
 */
export const selectThemePreference = async (
  preference: ThemePreference,
): Promise<void> => {
  const previous = getThemePreferenceInEffect();
  if (preference === previous) {
    return;
  }
  setThemePreference(preference);
  // Captured now: a quicker second pick can change the page before this
  // save resolves.
  const colorScheme = getAppliedColorScheme();

  await saveThemePreference(preference);

  emitThemeChanged({ preference, previous, colorScheme });
  // A newer pick, here or in another open page, has replaced this one and
  // reports its own value; this late save must not overwrite it.
  if (preference === getThemePreferenceInEffect()) {
    syncPreferredThemeTrait(preference, { force: true });
  }
};
