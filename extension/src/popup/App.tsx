import React from "react";
import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import { createGlobalStyle } from "styled-components";

import { metricsMiddleware } from "helpers/metrics";

import { COLOR_PALETTE } from "popup/constants/styles";
import { reducer as auth } from "popup/ducks/authServices";
import { POPUP_WIDTH, POPUP_HEIGHT } from "constants/dimensions";

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
    width: ${POPUP_WIDTH}px;
  }
  body, html, #root {
    height: ${POPUP_HEIGHT}px;
    width: 100%;
  }

  body * {
    box-sizing: border-box;
  }

  a {
    color: ${COLOR_PALETTE.primary};
    text-decoration: none;
  }
`;

const rootReducer = combineReducers({
  auth,
});
export type AppState = ReturnType<typeof rootReducer>;
const store = configureStore({
  reducer: rootReducer,
  middleware: [metricsMiddleware<AppState>(), ...getDefaultMiddleware()],
});

export function App() {
  return (
    <Provider store={store}>
      <GlobalStyle />
      <Router />
    </Provider>
  );
}
