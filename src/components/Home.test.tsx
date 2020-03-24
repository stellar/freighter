import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";

import { render } from "@testing-library/react";
import { Home } from "./Home";

import { reducer as counter } from "ducks/counter";

const store = configureStore({
  reducer: combineReducers({
    counter,
  }),
});

test("renders learn react link", () => {
  const { getByText } = render(
    <Provider store={store}>
      <Home />
    </Provider>,
  );
  const linkElement = getByText(/The counter is now/i);
  expect(linkElement).toBeInTheDocument();
});
