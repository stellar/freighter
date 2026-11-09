import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { WalletType } from "@shared/constants/hardwareWallet";
import * as ApiInternal from "@shared/api/internal";
import {
  reducer as authReducer,
  accountNameSelector,
  activeAccountSelector,
  hardwareWalletTypeSelector,
  lockAccount,
  makeAccountActive,
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
    expect(auth.activeAccountId).toBe("");
    expect(auth.bipPath).toBe("");
    expect(auth.tokenIdList).toEqual([]);
    // Left intact so `<UnlockAccountRoute>` still renders `<UnlockAccount>`
    // instead of redirecting to `<Welcome>`.
    expect(auth.applicationState).toBe("MNEMONIC_PHRASE_CONFIRMED");
  });
});

describe("active account with a shared address", () => {
  // A hot account and a Ledger on the same seed share an address. Only the id
  // tells the selectors which one is active.
  const SHARED = "GSHARED";
  const hot = { id: "stellarkeys:hot", publicKey: SHARED, name: "Account 1" };
  const ledger = {
    id: `hw:${SHARED}`,
    publicKey: SHARED,
    name: "Ledger 1",
    hardwareWalletType: WalletType.LEDGER,
  };

  const makeSharedStore = (activeAccountId: string) =>
    configureStore({
      reducer: combineReducers({ auth: authReducer }),
      preloadedState: {
        auth: {
          allAccounts: [hot, ledger],
          migratedAccounts: [],
          applicationState: "MNEMONIC_PHRASE_CONFIRMED",
          hasPrivateKey: true,
          publicKey: SHARED,
          activeAccountId,
          connectingWalletType: "NONE",
          bipPath: "",
          tokenIdList: [],
          error: "",
          accountStatus: "IDLE",
          isAccountMismatch: false,
        },
      } as any,
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resolves the Ledger by id, not the first row with the address", () => {
    const state = makeSharedStore(ledger.id).getState();

    expect(activeAccountSelector(state)?.id).toBe(ledger.id);
    expect(hardwareWalletTypeSelector(state)).toBe(WalletType.LEDGER);
    expect(accountNameSelector(state)).toBe("Ledger 1");
  });

  it("resolves the hot account by id", () => {
    const state = makeSharedStore(hot.id).getState();

    expect(activeAccountSelector(state)?.id).toBe(hot.id);
    expect(hardwareWalletTypeSelector(state)).toBe(WalletType.NONE);
  });

  it("falls back to the address when the id names another address", () => {
    const state = makeSharedStore("stellarkeys:other").getState();

    expect(activeAccountSelector(state)?.id).toBe(hot.id);
  });

  it("sends the id on a switch and stores the id the background returns", async () => {
    const store = makeSharedStore(hot.id);
    const service = jest
      .spyOn(ApiInternal, "makeAccountActive")
      .mockResolvedValue({
        publicKey: SHARED,
        activeAccountId: ledger.id,
        hasPrivateKey: true,
        bipPath: "44'/148'/0'",
      });

    // The thunk is typed against the full AppState; this store holds `auth`
    // only, which is all it reads.
    await (store.dispatch as any)(makeAccountActive({ id: ledger.id }));

    expect(service).toHaveBeenCalledWith({
      activePublicKey: SHARED,
      account: { id: ledger.id },
    });
    expect(store.getState().auth.activeAccountId).toBe(ledger.id);
    expect(hardwareWalletTypeSelector(store.getState())).toBe(
      WalletType.LEDGER,
    );
  });
});
