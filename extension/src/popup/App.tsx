import React, { Suspense } from "react";
import {
  configureStore,
  isPlain,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import { BigNumber } from "bignumber.js";

import { metricsMiddleware } from "helpers/metrics";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";
import { reducer as soroban } from "popup/ducks/soroban";

import { Loading } from "popup/components/Loading";
import { ErrorTracking } from "popup/components/ErrorTracking";

import { Router } from "./Router";

import "./styles/global.scss";

// ALEC TODO - remove
const loggerMiddleware = (storeVal: any) => (next: any) => (action: any) => {
  console.log("Dispatching: ", action.type);
  const dispatchedAction = next(action);
  console.log("NEW STATE: ", storeVal.getState());
  return dispatchedAction;
};

// .isBigNumber() not catching correctly, so checking .isBigNumber
// property as well
const isSerializable = (value: any) =>
  value?.isBigNumber || BigNumber.isBigNumber(value) || isPlain(value);

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  soroban,
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
  ].concat(metricsMiddleware<AppState>(), loggerMiddleware),
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
