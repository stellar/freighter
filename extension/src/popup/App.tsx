import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";

import { metricsMiddleware, initAmplitude } from "helpers/metrics";
import { activePublicKeyMiddleware } from "helpers/activePublicKeyMiddleware";
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

// Expose the Redux store for Playwright E2E tests.
// `IS_PLAYWRIGHT` is injected by the test fixture's `page.addInitScript` before
// any application scripts run, so this assignment is always reached when tests run.
if ((window as any).IS_PLAYWRIGHT) {
  (window as any).__store = store;
}

initAmplitude();

/**
 * Initializes the remote config (Amplitude Experiment flags) and renders the
 * maintenance screen overlay when the `maintenance_screen` flag is active.
 */
const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  useRemoteConfig();
  return (
    <>
      <MaintenanceScreen />
      {children}
    </>
  );
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
