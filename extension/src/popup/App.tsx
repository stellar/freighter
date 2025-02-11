import React, { Suspense } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";

import { metricsMiddleware } from "helpers/metrics";
import { actibePublicKeyMiddleware } from "helpers/activePublicKeyMiddleware";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";
import { reducer as tokenPaymentSimulation } from "popup/ducks/token-payment";
import { Loading } from "popup/components/Loading";
import { ErrorTracking } from "popup/components/ErrorTracking";
import { AccountMismatch } from "popup/components/AccountMismatch";
import { storeHolder } from "@shared/api/helpers/storeHolder";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Router } from "./Router";

import "./styles/global.scss";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  tokenPaymentSimulation,
});
export type AppState = ReturnType<typeof rootReducer>;
export const store = configureStore({
  reducer: rootReducer,

  middleware: (defaults) =>
    defaults({ serializableCheck: false }).concat(
      metricsMiddleware<AppState>(),
      actibePublicKeyMiddleware<AppState>(),
    ),
});

export type AppDispatch = typeof store.dispatch;

storeHolder.currentStore = store;
// console.log(storeHolder.currentStore);

export const App = () => (
  <ErrorBoundary>
    <Provider store={store}>
      <AccountMismatch />
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
