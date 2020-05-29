import { createHashHistory } from "history";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import { createGlobalStyle } from "styled-components";

import { COLOR_PALETTE } from "popup/styles";
import { reducer as auth } from "popup/ducks/authServices";
import Router from "./Router";

const GlobalStyle = createGlobalStyle`
html, body, #root {
  height: 100%;
}
  body {
    background: ${COLOR_PALETTE.background};
    overscroll-behavior: none;
    font-family: 'Muli', sans-serif;
    margin: 0;
  }
`;

const store = configureStore({
  reducer: combineReducers({
    auth,
  }),
});

export const history = createHashHistory();

export function App() {
  return (
    <Provider store={store}>
      <GlobalStyle />
      <Router />
    </Provider>
  );
}
