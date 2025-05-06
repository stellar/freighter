import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";

import { metricsMiddleware } from "helpers/metrics";
import { activePublicKeyMiddleware } from "helpers/activePublicKeyMiddleware";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";
import { reducer as tokenPaymentSimulation } from "popup/ducks/token-payment";
import { reducer as balances } from "popup/ducks/balances";
import { ErrorTracking } from "popup/components/ErrorTracking";
import { AccountMismatch } from "popup/components/AccountMismatch";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Router } from "./Router";

import "./styles/global.scss";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  tokenPaymentSimulation,
  balances,
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

export const App = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <AccountMismatch />
      <ErrorTracking />
      <Router />
    </Provider>
  </ErrorBoundary>
);
