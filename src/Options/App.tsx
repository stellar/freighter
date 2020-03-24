import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import { createGlobalStyle } from "styled-components";

import { About } from "components/About";
import { Home } from "components/Home";

import { reducer as counter } from "ducks/counter";

const GlobalStyle = createGlobalStyle`
  body {
    font-family: sans-serif;
  }
`;

const store = configureStore({
  reducer: combineReducers({
    counter,
  }),
});

export function App() {
  return (
    <Provider store={store}>
      <Router>
        <div>
          <GlobalStyle />
          <nav>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
            </ul>
          </nav>

          {/* A <Switch> looks through its children <Route>s and
            renders the first one that matches the current URL. */}
          <Switch>
            <Route path="/about">
              <About />
            </Route>
            <Route path="/">
              <Home />
            </Route>
          </Switch>
        </div>
      </Router>
    </Provider>
  );
}
