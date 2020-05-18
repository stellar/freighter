import { createHashHistory } from "history";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import styled, { createGlobalStyle } from "styled-components";

import { reducer as auth } from "ducks/authServices";
import Menu from "components/Menu";
import Router from "./Router";

const GlobalStyle = createGlobalStyle`
  body {
    font-family: sans-serif;
    width: 357px;
    height: 600px;
    margin: 0;
  }
`;

const Wrapper = styled.div`
  text-align: center;
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
        <Menu />
        <Router store={store} />
      </Wrapper>
    </Provider>
  );
}
