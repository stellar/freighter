import React from "react";
import {
  configureStore,
  isPlain,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";
import { BigNumber } from "bignumber.js";

import { metricsMiddleware } from "helpers/metrics";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";

import { Router } from "./Router";

import "./styles/global.scss";

// .isBigNumber() not catching correctly, so checking .isBigNumber
// property as well
const isSerializable = (value: any) =>
  value?.isBigNumber || BigNumber.isBigNumber(value) || isPlain(value);

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
});
export type AppState = ReturnType<typeof rootReducer>;
export const store = configureStore({
  reducer: rootReducer,

  middleware: [
    ...getDefaultMiddleware({
      serializableCheck: {
        isSerializable,
      },
    }),
  ].concat(metricsMiddleware<AppState>()),
});
export type AppDispatch = typeof store.dispatch;

if (process.env.SENTRY_KEY) {
  Sentry.init({
    dsn: process.env.SENTRY_KEY,
    release: `freighter@${process.env.npm_package_version}`,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
  });
}

export function App() {
  return (
    <Provider store={store}>
      <span>test</span>
      <Router />
    </Provider>
  );
}
