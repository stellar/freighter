import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";

import { sessionSlice } from "background/ducks/session";
import {
  HIDDEN_ASSETS,
  HIDDEN_ASSET_LIST,
  NETWORKS_LIST_ID,
} from "constants/localStorageTypes";
import { getHiddenAssets, setAssetVisibility } from "../hidden-assets";

const ACCOUNT_A = "G-ACCOUNT-A";
const ACCOUNT_B = "G-ACCOUNT-B";
const USDC = "USDC:G-USDC-ISSUER";
const SPAM = "SPAM:G-SPAM-ISSUER";

const makeLocalStore = (initial: Record<string, unknown> = {}) => {
  const store: Record<string, unknown> = {
    [NETWORKS_LIST_ID]: [{ network: "PUBLIC" }, { network: "TESTNET" }],
    ...initial,
  };
  return {
    store,
    localStore: {
      getItem: jest.fn(async (key: string) => store[key]),
      setItem: jest.fn(async (key: string, value: unknown) => {
        store[key] = value;
      }),
      remove: jest.fn(async (key: string) => {
        delete store[key];
      }),
    } as any,
  };
};

const makeSessionStore = (publicKeys: string[]) => {
  const initialSession = sessionSlice.reducer(undefined, { type: "init" });
  return configureStore({
    reducer: combineReducers({ session: sessionSlice.reducer }),
    preloadedState: {
      session: {
        ...initialSession,
        allAccounts: publicKeys.map((publicKey) => ({
          publicKey,
          name: publicKey,
          imported: false,
          hardwareWalletType: "",
        })),
      },
    } as any,
  });
};

describe("hidden assets", () => {
  it("keeps each account's hidden assets apart", async () => {
    const { localStore } = makeLocalStore();
    const sessionStore = makeSessionStore([ACCOUNT_A, ACCOUNT_B]);

    await setAssetVisibility({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      canonical: SPAM,
      visibility: "hidden",
      localStore,
      sessionStore,
    });

    const forA = await getHiddenAssets({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      localStore,
      sessionStore,
    });
    const forB = await getHiddenAssets({
      publicKey: ACCOUNT_B,
      network: "PUBLIC",
      localStore,
      sessionStore,
    });
    const forAOnTestnet = await getHiddenAssets({
      publicKey: ACCOUNT_A,
      network: "TESTNET",
      localStore,
      sessionStore,
    });

    expect(forA).toEqual({ hiddenAssets: { [SPAM]: "hidden" } });
    expect(forB).toEqual({ hiddenAssets: {} });
    expect(forAOnTestnet).toEqual({ hiddenAssets: {} });
  });

  it("drops empty entries when an asset is shown again", async () => {
    const { localStore, store } = makeLocalStore({
      [HIDDEN_ASSET_LIST]: {
        [ACCOUNT_A]: { PUBLIC: [SPAM] },
        [ACCOUNT_B]: { PUBLIC: [SPAM] },
      },
    });
    const sessionStore = makeSessionStore([ACCOUNT_A, ACCOUNT_B]);

    const result = await setAssetVisibility({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      canonical: SPAM,
      visibility: "visible",
      localStore,
      sessionStore,
    });

    expect(result).toEqual({ hiddenAssets: {} });
    expect(store[HIDDEN_ASSET_LIST]).toEqual({
      [ACCOUNT_B]: { PUBLIC: [SPAM] },
    });
  });

  it("moves the old wallet-wide map to every account on every network", async () => {
    const { localStore, store } = makeLocalStore({
      [HIDDEN_ASSETS]: { [SPAM]: "hidden", [USDC]: "visible" },
    });
    const sessionStore = makeSessionStore([ACCOUNT_A, ACCOUNT_B]);

    const result = await getHiddenAssets({
      publicKey: ACCOUNT_B,
      network: "TESTNET",
      localStore,
      sessionStore,
    });

    expect(result).toEqual({ hiddenAssets: { [SPAM]: "hidden" } });
    expect(store[HIDDEN_ASSET_LIST]).toEqual({
      [ACCOUNT_A]: { PUBLIC: [SPAM], TESTNET: [SPAM] },
      [ACCOUNT_B]: { PUBLIC: [SPAM], TESTNET: [SPAM] },
    });
    expect(store[HIDDEN_ASSETS]).toBeUndefined();
  });

  it("keeps the old map until the session lists the accounts", async () => {
    const { localStore, store } = makeLocalStore({
      [HIDDEN_ASSETS]: { [SPAM]: "hidden" },
    });

    const result = await getHiddenAssets({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      localStore,
      sessionStore: makeSessionStore([]),
    });

    expect(result).toEqual({ hiddenAssets: {} });
    expect(store[HIDDEN_ASSETS]).toEqual({ [SPAM]: "hidden" });
    expect(store[HIDDEN_ASSET_LIST]).toBeUndefined();
  });

  it("merges the old map into lists already saved per account", async () => {
    const { localStore, store } = makeLocalStore({
      [HIDDEN_ASSETS]: { [SPAM]: "hidden" },
      [HIDDEN_ASSET_LIST]: { [ACCOUNT_A]: { PUBLIC: [USDC, SPAM] } },
    });

    await getHiddenAssets({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      localStore,
      sessionStore: makeSessionStore([ACCOUNT_A]),
    });

    expect(store[HIDDEN_ASSET_LIST]).toEqual({
      [ACCOUNT_A]: { PUBLIC: [USDC, SPAM], TESTNET: [SPAM] },
    });
  });
});
