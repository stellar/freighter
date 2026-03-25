import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider, useSelector } from "react-redux";

import { metricsMiddleware, initAmplitude } from "helpers/metrics";
import { activePublicKeyMiddleware } from "helpers/activePublicKeyMiddleware";
import { BUILD_TYPE } from "constants/env";
import { Toaster } from "popup/basics/shadcn/Toast";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";
import { reducer as tokenPaymentSimulation } from "popup/ducks/token-payment";
import { reducer as cache } from "popup/ducks/cache";
import { reducer as remoteConfig } from "popup/ducks/remoteConfig";
import { ErrorTracking } from "popup/components/ErrorTracking";
import { AccountMismatch } from "popup/components/AccountMismatch";
import { MaintenanceScreen } from "popup/components/MaintenanceScreen";
import { useRemoteConfig } from "popup/helpers/hooks/useRemoteConfig";
import { maintenanceScreenSelector } from "popup/ducks/remoteConfig";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Router } from "./Router";

import "./styles/global.scss";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  tokenPaymentSimulation,
  cache,
  remoteConfig,
});
export type AppState = ReturnType<typeof rootReducer>;
export const store = configureStore({
  reducer: rootReducer,

  middleware: (defaults) =>
    defaults({ serializableCheck: false }).concat(
      metricsMiddleware<AppState>(),
      activePublicKeyMiddleware<AppState>(),
    ),
});

export type AppDispatch = typeof store.dispatch;

// Typed window extension — only used in non-production builds for E2E testing.
declare global {
  interface Window {
    IS_PLAYWRIGHT?: boolean;
    __store?: typeof store;
  }
}

// Expose the Redux store for Playwright E2E tests.
// SECURITY: Only exposed in development builds (dev server), NOT in beta builds.
// The double-guard (BUILD_TYPE check + IS_PLAYWRIGHT flag) prevents privilege
// escalation in beta builds where a malicious script could set IS_PLAYWRIGHT=true.
// Playwright tests run against the dev server, so this restriction is safe.
if (BUILD_TYPE === "development" && window.IS_PLAYWRIGHT) {
  window.__store = store;
}

initAmplitude();

/**
 * Initializes the remote config (Amplitude Experiment flags). When the
 * `maintenance_screen` flag is active, renders only the maintenance screen
 * and suppresses all other app content.
 */
const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  useRemoteConfig();
  const { enabled, content } = useSelector(maintenanceScreenSelector);

  if (enabled) {
    return <MaintenanceScreen content={content} />;
  }

  return <>{children}</>;
};

export const App = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <MaintenanceGate>
        <AccountMismatch />
        <Toaster />
        <ErrorTracking />
        <Router />
      </MaintenanceGate>
    </Provider>
  </ErrorBoundary>
);
