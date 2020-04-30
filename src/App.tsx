import { createHashHistory } from "history";
import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import styled, { createGlobalStyle } from "styled-components";

import { reducer as auth, loadAccount } from "ducks/authServices";
import Router from "./Router";

const GlobalStyle = createGlobalStyle`
  body {
    font-family: sans-serif;
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

store.dispatch(loadAccount());

const {
  auth: { applicationState },
} = store.getState();

export const history = createHashHistory();

export function App() {
  return (
    <Provider store={store}>
      <Wrapper>
        <GlobalStyle />
        <Router applicationState={applicationState} />
      </Wrapper>
    </Provider>
  );
}
