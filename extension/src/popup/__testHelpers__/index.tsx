import React from "react";
import { Provider } from "react-redux";
import { Account, BASE_FEE, SorobanRpc, TransactionBuilder } from "stellar-sdk";
import BigNumber from "bignumber.js";
import { createMemoryHistory } from "history";
import {
  configureStore,
  combineReducers,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { Balances } from "@shared/api/types";
import { FUTURENET_NETWORK_DETAILS } from "@shared/constants/stellar";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import {
  reducer as transactionSubmission,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";
import { SorobanContext } from "../SorobanContext";

const publicKey = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";

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
    middleware: [
      ...getDefaultMiddleware({
        serializableCheck: false,
      }),
    ],
  });

const MockSorobanProvider = ({
  children,
  pubKey,
}: {
  children: React.ReactNode;
  pubKey: string;
}) => {
  const server = new SorobanRpc.Server(FUTURENET_NETWORK_DETAILS.networkUrl, {
    allowHttp: FUTURENET_NETWORK_DETAILS.networkUrl.startsWith("http://"),
  });

  const newTxBuilder = async (fee = BASE_FEE) => {
    const sourceAccount = new Account(pubKey, "0");
    return new TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: FUTURENET_NETWORK_DETAILS.networkPassphrase,
    });
  };

  return (
    <SorobanContext.Provider value={{ server, newTxBuilder }}>
      {children}
    </SorobanContext.Provider>
  );
};

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
          <MockSorobanProvider pubKey={publicKey}>
            {children}
          </MockSorobanProvider>
        </Provider>
      </Router>
    </>
  );
};

export const mockBalances = {
  tokensWithNoBalance: [],
  balances: ({
    ["DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ"]: {
      token: {
        code: "DT",
        issuer: {
          key: "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        },
      },
      decimals: 7,
      total: new BigNumber("10"),
      available: new BigNumber("10"),
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
