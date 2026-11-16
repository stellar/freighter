import { ThemePreference } from "@shared/constants/theme";
import { emitMetric, syncPreferredThemeTrait } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

export const emitThemeChanged = (
  preference: ThemePreference,
  previous: ThemePreference,
): void => {
  emitMetric(METRIC_NAMES.themeChanged, {
    preferred_theme: preference,
    previous_preferred_theme: previous,
  });
  syncPreferredThemeTrait(preference);
};
