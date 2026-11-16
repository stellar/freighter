import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "popup/helpers/localizationConfig";
import { initColorScheme } from "popup/helpers/systemTheme";
import { syncThemePreferenceFromStorage } from "popup/helpers/themePreference";

// Import global CSS from Stellar Design System
import "@stellar/design-system/build/styles.min.css";
// Inter, which SDS names as its font but doesn't ship
import "./styles/fonts.scss";
// Varial palette override — must come after the SDS stylesheet
import "./styles/varialPalette.scss";
import "./styles/vendor/tailwind.css";

// Before render, so the first paint already uses the saved theme. The
// static sds-theme-light on <body> stays as the pre-script fallback —
// light-first, same as mobile.
const hasMirroredTheme = initColorScheme();
if (!hasMirroredTheme) {
  syncThemePreferenceFromStorage();
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
