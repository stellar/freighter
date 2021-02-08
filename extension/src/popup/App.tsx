import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import styled, { createGlobalStyle } from "styled-components";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

import { POPUP_WIDTH, POPUP_HEIGHT } from "constants/dimensions";

import { metricsMiddleware } from "helpers/metrics";

import { COLOR_PALETTE } from "popup/constants/styles";
import { reducer as auth } from "popup/ducks/authServices";
import { reducer as settings } from "popup/ducks/settings";

import { Loading } from "popup/views/Loading";

import { Router } from "./Router";

const GlobalStyle = createGlobalStyle`
  body {
    background: ${COLOR_PALETTE.background};
    overscroll-behavior: none;
    font-family: 'Muli', sans-serif;
    font-size: 100%;
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
  background: ${COLOR_PALETTE.background};
  height: 100%;
`;

const rootReducer = combineReducers({
  auth,
  settings,
});
export type AppState = ReturnType<typeof rootReducer>;
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(metricsMiddleware<AppState>()),
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
      <Loading />
    </Provider>
  );
}
