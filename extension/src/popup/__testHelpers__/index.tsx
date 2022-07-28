import React from "react";
import { Provider } from "react-redux";
import { createMemoryHistory } from "history";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import {
  reducer as transactionSubmission,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
});

const { Router } = jest.requireActual("react-router-dom");

const makeDummyStore = (state: any) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: state,
  });

export const Wrapper: React.FunctionComponent<any> = ({
  children,
  state,
  history,
}: {
  children: React.ReactChildren;
  state: {};
  history?: any;
}) => {
  const routerHistory = history || createMemoryHistory();

  return (
    <>
      <Router history={routerHistory}>
        <Provider
          store={makeDummyStore({
            auth: {
              allAccounts: ["G123"],
              publicKey: "G123",
              applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            },
            transactionSubmission: transactionSubmissionInitialState,
            ...state,
          })}
        >
          {children}
        </Provider>
      </Router>
    </>
  );
};
