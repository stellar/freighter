import React from "react";
import {
  configureStore,
  // isPlain,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import styled, { createGlobalStyle } from "styled-components";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";
// import { BigNumber } from "bignumber.js";

import { POPUP_WIDTH, POPUP_HEIGHT } from "constants/dimensions";

import { metricsMiddleware } from "helpers/metrics";

import { COLOR_PALETTE } from "popup/constants/styles";
import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";

import { Router } from "./Router";

import "./styles/global.scss";

const GlobalStyle = createGlobalStyle`
  body {
    overscroll-behavior: none;
    margin: 0;
    padding:0;
  }

  body, html {
    height: ${POPUP_HEIGHT}px;
    width: ${POPUP_WIDTH}px;
  }

  #root {
    display: flex;
    flex-flow: column;
    height: 100%;
    position: relative;
  }

  body * {
    box-sizing: border-box;
  }

  a {
    color: ${COLOR_PALETTE.primary};
    text-decoration: none;
  }
`;

const RouteWrapperEl = styled.div`
  height: 100%;
`;

// ALEC TODO - remove
const loggerMiddleware = (storeVal: any) => (next: any) => (action: any) => {
  console.log("Dispatching: ", action.type);
  const dispatchedAction = next(action);
  console.log("NEW STATE: ", storeVal.getState());
  return dispatchedAction;
};

// ALEC TODO - figure out why this isn't working
// const isSerializable = (value: any) => BigNumber.isBigNumber(value) || isPlain(value);
const isSerializable = () => true;

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
  ].concat(metricsMiddleware<AppState>(), loggerMiddleware),
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
      <GlobalStyle />
      <RouteWrapperEl>
        <Router />
      </RouteWrapperEl>
    </Provider>
  );
}
