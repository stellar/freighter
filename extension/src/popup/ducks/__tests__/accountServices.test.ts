import { combineReducers, configureStore } from "@reduxjs/toolkit";

import * as internalApi from "@shared/api/internal";
import {
  ACCOUNT_FUNDING_RECORDS_ID,
  FUNDED_ACCOUNTS_REFRESHED_AT_ID,
  FUNDED_ACCOUNTS_REFRESH_LEASE_ID,
  METRICS_DATA,
  METRICS_USER_ID,
} from "constants/localStorageTypes";

import {
  reducer as authReducer,
  lockAccount,
  resetWallet,
} from "../accountServices";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  resetWallet: jest.fn(),
}));

const makeStore = () =>
  configureStore({
    reducer: combineReducers({ auth: authReducer }),
    preloadedState: {
      auth: {
        allAccounts: [
          { publicKey: "GBTEST", name: "Account 1", imported: false } as any,
        ],
        migratedAccounts: [],
        applicationState: "MNEMONIC_PHRASE_CONFIRMED",
        hasPrivateKey: true,
        publicKey: "GBTEST",
        connectingWalletType: "NONE",
        bipPath: "m/44'/148'/0'",
        tokenIdList: ["token1"],
        error: "",
        accountStatus: "IDLE",
        isAccountMismatch: false,
      },
    } as any,
  });

describe("accountServices lockAccount reducer", () => {
  it("clears private-key-derived state but preserves applicationState", () => {
    const store = makeStore();

    store.dispatch(lockAccount());

    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(false);
    expect(auth.publicKey).toBe("");
    expect(auth.allAccounts).toEqual([]);
    expect(auth.bipPath).toBe("");
    expect(auth.tokenIdList).toEqual([]);
    // Left intact so `<UnlockAccountRoute>` still renders `<UnlockAccount>`
    // instead of redirecting to `<Welcome>`.
    expect(auth.applicationState).toBe("MNEMONIC_PHRASE_CONFIRMED");
  });
});

describe("accountServices resetWallet", () => {
  it("clears the analytics state of the erased wallet from page storage", async () => {
    (internalApi.resetWallet as jest.Mock).mockResolvedValue({});
    [
      METRICS_DATA,
      METRICS_USER_ID,
      ACCOUNT_FUNDING_RECORDS_ID,
      FUNDED_ACCOUNTS_REFRESHED_AT_ID,
      FUNDED_ACCOUNTS_REFRESH_LEASE_ID,
    ].forEach((key) => localStorage.setItem(key, "1"));

    await makeStore().dispatch(resetWallet() as any);

    // A refresh time or a lease of the erased wallet must not delay the
    // refresh of the next wallet.
    expect(localStorage.getItem(METRICS_DATA)).toBeNull();
    expect(localStorage.getItem(METRICS_USER_ID)).toBeNull();
    expect(localStorage.getItem(ACCOUNT_FUNDING_RECORDS_ID)).toBeNull();
    expect(localStorage.getItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID)).toBeNull();
    expect(localStorage.getItem(FUNDED_ACCOUNTS_REFRESH_LEASE_ID)).toBeNull();
  });
});
