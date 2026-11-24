import { ThemePreference } from "@shared/constants/theme";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ColorScheme } from "popup/helpers/systemTheme";

export const emitThemeChanged = ({
  preference,
  previous,
  colorScheme,
}: {
  preference: ThemePreference;
  previous: ThemePreference;
  // The scheme this choice produced, which may no longer be on screen by the
  // time its save finishes.
  colorScheme: ColorScheme;
}): void => {
  emitMetric(METRIC_NAMES.themeChanged, {
    preferred_theme: preference,
    previous_preferred_theme: previous,
    color_scheme: colorScheme,
  });
};
