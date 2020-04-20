import { createHashHistory } from "history";
import React from "react";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import { createGlobalStyle } from "styled-components";

import CreatePassword from "views/CreatePassword";
import MnemonicPhrase from "views/MnemonicPhrase";
import Welcome from "views/Welcome";

import { reducer as counter } from "ducks/counter";
import { reducer as auth } from "ducks/authServices";

const GlobalStyle = createGlobalStyle`
  body {
    font-family: sans-serif;
  }
`;

const store = configureStore({
  reducer: combineReducers({
    counter,
    auth,
  }),
});

export const history = createHashHistory();

export function App() {
  return (
    <Provider store={store}>
      <Router>
        <div>
          <GlobalStyle />

          {/* A <Switch> looks through its children <Route>s and
            renders the first one that matches the current URL. */}
          <Switch>
            <Route path="/mnemonic-phrase">
              <MnemonicPhrase />
            </Route>
            <Route path="/create-password">
              <CreatePassword />
            </Route>
            <Route path="/">
              <Welcome />
            </Route>
          </Switch>
        </div>
      </Router>
    </Provider>
  );
}
