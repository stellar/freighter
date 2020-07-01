import { createHashHistory } from "history";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import { createGlobalStyle } from "styled-components";

import { COLOR_PALETTE } from "popup/styles";
import { reducer as auth } from "popup/ducks/authServices";
import { POPUP_WIDTH } from "popup/constants";
import { Header } from "popup/components/Layout/Header";

import Router from "./Router";

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
    height: 100vh;
  }

  body * {
    box-sizing: border-box;
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
      <Router />
    </Provider>
  );
}
