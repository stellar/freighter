import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "popup/helpers/localizationConfig";
import { followSystemColorScheme } from "popup/helpers/systemTheme";

// Import global CSS from Stellar Design System
import "@stellar/design-system/build/styles.min.css";
// Varial palette override — must come after the SDS stylesheet
import "./styles/varialPalette.scss";
import "./styles/vendor/tailwind.css";

// Before render, so the first paint is already in the device scheme. The
// static sds-theme-dark on <body> stays as the pre-script fallback.
followSystemColorScheme();

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
