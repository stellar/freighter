import React, { Suspense } from "react";
import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";

import { metricsMiddleware } from "helpers/metrics";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";
import { reducer as tokenPaymentSimulation } from "popup/ducks/token-payment";
import { Loading } from "popup/components/Loading";
import { ErrorTracking } from "popup/components/ErrorTracking";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Router } from "./Router";

import "./styles/global.scss";

import "@shared/view/global.css";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  tokenPaymentSimulation,
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

export const App = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <ErrorTracking />
      <Suspense
        fallback={
          <div className="RouterLoading">
            <Loading />
          </div>
        }
      >
        <Router />
      </Suspense>
    </Provider>
  </ErrorBoundary>
);
