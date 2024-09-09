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
import { Balances } from "@shared/api/types";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { defaultBlockaidScanAssetResult } from "popup/helpers/blockaid";
import {
  reducer as transactionSubmission,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";
import { reducer as tokenPaymentSimulation } from "popup/ducks/token-payment";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  tokenPaymentSimulation,
});

const { Router } = jest.requireActual("react-router-dom");

const makeDummyStore = (state: any) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: state,
    middleware: [
      ...getDefaultMiddleware({
        serializableCheck: false,
      }),
    ],
  });

export const Wrapper: React.FunctionComponent<any> = ({
  children,
  state,
  history,
}: {
  children: React.ReactNode;
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

export const mockBalances = {
  balances: {
    ["DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ"]: {
      token: {
        code: "DT",
        issuer: {
          key: "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        },
      },
      decimals: 7,
      total: new BigNumber("1000000000"),
      available: new BigNumber("1000000000"),
      blockaidData: defaultBlockaidScanAssetResult,
    },
    ["USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
      token: {
        code: "USDC",
        issuer: {
          key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        },
      },
      total: new BigNumber("100"),
      available: new BigNumber("100"),
      blockaidData: {
        result_type: "Spam",
        features: [{ description: "" }],
      },
    },
    native: {
      token: { type: "native", code: "XLM" },
      total: new BigNumber("50"),
      available: new BigNumber("50"),
      blockaidData: defaultBlockaidScanAssetResult,
    },
  } as any as Balances,
  isFunded: true,
  subentryCount: 1,
};

export const mockTokenBalance = {
  balance: 10,
  decimals: 0,
  name: "Demo Token",
  symbol: "DT",
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
