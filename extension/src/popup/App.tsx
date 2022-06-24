import React from "react";
import {
  configureStore,
  isPlain,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import { Provider } from "react-redux";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";
import { BigNumber } from "bignumber.js";

import { metricsMiddleware } from "helpers/metrics";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as transactionSubmission } from "popup/ducks/transactionSubmission";

// eslint-disable-next-line
import { Router } from "./Router";

import "./styles/global.scss";

// ALEC TODO - remove
import { Response } from "@shared/api/types";
import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "../background/messageListener/popupMessageListener";
// import { privateKeySelector } from "../background/ducks/session";
import { store as backgroundStore } from "../background/store";
// testing background script

// reset

(async () => {
  localStorage.clear();

  let r = {} as Response;
  r.type = SERVICE_TYPES.CREATE_ACCOUNT;
  r.password = "test";
  await popupMessageListener(r);

  // r = {} as Response;
  // r.type = SERVICE_TYPES.IMPORT_ACCOUNT;
  // r.password = "test";
  // r.privateKey = "SABNZQ56YMRRYTULV7Y4TTNRCYOOQV36VL3IUN6V4FWHSMDROP6L5VUR";
  // await popupMessageListener(r);

  // console.log(
  //   "imported SABNZQ56YMRRYTULV7Y4TTNRCYOOQV36VL3IUN6V4FWHSMDROP6L5VUR",
  // );
  // console.log("localStorage.getItem(keyId)", localStorage.getItem("keyId"));
  // console.log("current store", backgroundStore.getState());

  console.log("calling IMPORT_HARDWARE_WALLET (regular account");
  r = {} as Response;
  r.type = SERVICE_TYPES.IMPORT_ACCOUNT;
  r.password = "test";
  r.privateKey = "SAY4KPFMEGW63HBYLUCXN3MLJX5UA4CGBYW6T5FCWIMYHWW5F2ANHLM6";
  await popupMessageListener(r);

  // console.log(
  //   "imported SAY4KPFMEGW63HBYLUCXN3MLJX5UA4CGBYW6T5FCWIMYHWW5F2ANHLM6",
  // );
  // console.log("localStorage.getItem(keyId)", localStorage.getItem("keyId"));
  // console.log("current store", backgroundStore.getState());

  console.log("calling IMPORT_HARDWARE_WALLET (ledger account)");
  r = {} as Response;
  r.type = SERVICE_TYPES.IMPORT_HARDWARE_WALLET;
  r.hardwareWalletType = "ledger";
  r.publicKey = "GB4SFZUZIWKAUAJW2JR7CMBHZ2KNKGF3FMGMO7IF5P3EYXFA6NHI352W";
  await popupMessageListener(r);

  // r = {} as Response;
  // r.type = SERVICE_TYPES.CONFIRM_PASSWORD;
  // r.password = "test";
  // await popupMessageListener(r);

  // r = {} as Response;
  // r.type = SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE;
  // r.publicKey = "GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II";
  // await popupMessageListener(r);

  // console.log(
  //   "make account active: GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II",
  // );
  // console.log("localStorage.getItem(keyId)", localStorage.getItem("keyId"));
  // console.log("current store", backgroundStore.getState());

  console.log("calling CONFIRM_PASSWORD");
  r = {} as Response;
  r.type = SERVICE_TYPES.CONFIRM_PASSWORD;
  r.password = "test";
  await popupMessageListener(r);
  // console.log("confirm password");
  // console.log("localStorage.getItem(keyId)", localStorage.getItem("keyId"));
  // console.log("current store", backgroundStore.getState());
})();

// .isBigNumber() not catching correctly, so checking .isBigNumber
// property as well
const isSerializable = (value: any) =>
  value?.isBigNumber || BigNumber.isBigNumber(value) || isPlain(value);

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
});
export type AppState = ReturnType<typeof rootReducer>;
export const store = configureStore({
  reducer: rootReducer,

  middleware: [
    ...getDefaultMiddleware({
      serializableCheck: {
        isSerializable,
      },
    }),
  ].concat(metricsMiddleware<AppState>()),
});
export type AppDispatch = typeof store.dispatch;

if (process.env.SENTRY_KEY) {
  Sentry.init({
    dsn: process.env.SENTRY_KEY,
    release: `freighter@${process.env.npm_package_version}`,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
  });
}

export function App() {
  return (
    <Provider store={store}>
      <Router />
    </Provider>
  );
}
