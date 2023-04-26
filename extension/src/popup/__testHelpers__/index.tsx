import React from "react";
import { Provider } from "react-redux";
import BigNumber from "bignumber.js";
import { createMemoryHistory } from "history";
import {
  configureStore,
  combineReducers,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ActionStatus, Balances } from "@shared/api/types";

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

export const mockBalances = {
  balances: ({
    ["USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
      token: {
        code: "USDC",
        issuer: {
          key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        },
      },
      total: new BigNumber("100"),
      available: new BigNumber("100"),
    },
    native: {
      token: { type: "native", code: "XLM" },
      total: new BigNumber("50"),
      available: new BigNumber("50"),
    },
  } as any) as Balances,
  isFunded: true,
  subentryCount: 1,
};

export const mockAccounts = [
  {
    hardwareWalletType: "",
    imported: false,
    name: "Account 1",
    publicKey: "G1",
  },
  {
    hardwareWalletType: "",
    imported: true,
    name: "Account 2",
    publicKey: "G2",
  },
  {
    hardwareWalletType: "Ledger",
    imported: true,
    name: "Ledger 1",
    publicKey: "L1",
  },
];
