import { createHashHistory } from "history";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import { createGlobalStyle } from "styled-components";

import { COLOR_PALETTE } from "popup/styles";
import { reducer as auth } from "popup/ducks/authServices";
import Header from "popup/components/Layout/Header";
import Menu from "popup/components/Menu";
import Router from "./Router";

const GlobalStyle = createGlobalStyle`
  body {
    background: ${COLOR_PALETTE.background};
    overscroll-behavior: none;
    font-family: 'Muli', sans-serif;
    font-size: 100%;
    margin: 0;
  }

  body, html, #root {
    height: 100vh;
  }

  a {
    color: ${COLOR_PALETTE.primary};
    text-decoration: none;
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
      <Header />

      <Menu />
      <Router />
    </Provider>
  );
}
