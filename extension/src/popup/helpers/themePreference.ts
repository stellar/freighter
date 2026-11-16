import { ThemePreference } from "@shared/constants/theme";
import { getThemePreference, saveThemePreference } from "@shared/api/internal";
import { syncPreferredThemeTrait } from "helpers/metrics";
import {
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

/** Applies a preference immediately, then persists it to chrome.storage. */
export const changeThemePreference = async (
  preference: ThemePreference,
): Promise<void> => {
  setThemePreference(preference);
  await saveThemePreference(preference);
};
