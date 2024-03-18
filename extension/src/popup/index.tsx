import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "popup/helpers/localizationConfig";

// Import global CSS from Stellar Design System
import "@stellar/design-system/build/styles.min.css";

// eslint-disable-next-line react/jsx-filename-extension
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
