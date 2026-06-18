import { combineReducers, configureStore } from "@reduxjs/toolkit";

import {
  reducer as authReducer,
  lockAccount,
} from "../accountServices";

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
