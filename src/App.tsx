import { createHashHistory } from "history";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import styled, { createGlobalStyle } from "styled-components";

import { COLOR_PALETTE } from "styles";
import { reducer as auth } from "ducks/authServices";
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

const Wrapper = styled.div`
  display: flex;
  flex-flow: column;
  height: 100%;
  text-align: left;
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
      <Wrapper>
        <GlobalStyle />
        <Router />
      </Wrapper>
    </Provider>
  );
}
