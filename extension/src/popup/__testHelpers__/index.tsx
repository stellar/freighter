import React from "react";
import { Provider } from "react-redux";
import { createMemoryHistory } from "history";
import {
  configureStore,
  combineReducers,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ActionStatus } from "@shared/api/types";

import { isSerializable } from "helpers/stellar";
import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import {
  reducer as transactionSubmission,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";
import { reducer as soroban } from "popup/ducks/soroban";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  soroban,
});

const { Router } = jest.requireActual("react-router-dom");

const makeDummyStore = (state: any) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: state,
    middleware: [
      ...getDefaultMiddleware({
        serializableCheck: {
          isSerializable,
        },
      }),
    ],
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
            soroban: {
              getTokenBalancesStatus: ActionStatus.IDLE,
              tokenBalances: [],
            },
            ...state,
          })}
        >
          {children}
        </Provider>
      </Router>
    </>
  );
};
