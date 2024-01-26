import React, { Suspense } from "react";
import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";

import { metricsMiddleware } from "helpers/metrics";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";

import { Loading } from "popup/components/Loading";
import { ErrorTracking } from "popup/components/ErrorTracking";

import { Router } from "./Router";

import "./styles/global.scss";

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
      serializableCheck: false,
    }),
  ].concat(metricsMiddleware<AppState>()),
});

export type AppDispatch = typeof store.dispatch;

export function App() {
  return (
    <Provider store={store}>
      <ErrorTracking />
      <Suspense fallback={<Loading />}>
        <Router />
      </Suspense>
    </Provider>
  );
}
