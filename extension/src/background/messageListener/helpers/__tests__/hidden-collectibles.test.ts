import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";

import { sessionSlice } from "background/ducks/session";
import {
  HIDDEN_COLLECTIBLES,
  HIDDEN_COLLECTIBLE_LIST,
  NETWORKS_LIST_ID,
} from "constants/localStorageTypes";
import {
  getHiddenCollectibles,
  setCollectibleVisibility,
} from "../hidden-collectibles";

const ACCOUNT_A = "G-ACCOUNT-A";
const ACCOUNT_B = "G-ACCOUNT-B";
const PUNK = "C-PUNKS:1";
const APE = "C-APES:7";

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

describe("hidden collectibles", () => {
  it("keeps each account's hidden collectibles apart per network", async () => {
    const { localStore } = makeLocalStore();
    const sessionStore = makeSessionStore([ACCOUNT_A, ACCOUNT_B]);

    const written = await setCollectibleVisibility({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      collectible: PUNK,
      visibility: "hidden",
      localStore,
      sessionStore,
    });

    const forB = await getHiddenCollectibles({
      publicKey: ACCOUNT_B,
      network: "PUBLIC",
      localStore,
      sessionStore,
    });
    const forAOnTestnet = await getHiddenCollectibles({
      publicKey: ACCOUNT_A,
      network: "TESTNET",
      localStore,
      sessionStore,
    });

    expect(written).toEqual({ hiddenCollectibles: { [PUNK]: "hidden" } });
    expect(forB).toEqual({ hiddenCollectibles: {} });
    expect(forAOnTestnet).toEqual({ hiddenCollectibles: {} });
  });

  it("drops empty entries when a collectible is shown again", async () => {
    const { localStore, store } = makeLocalStore({
      [HIDDEN_COLLECTIBLE_LIST]: {
        [ACCOUNT_A]: { PUBLIC: [PUNK] },
        [ACCOUNT_B]: { PUBLIC: [PUNK] },
      },
    });
    const sessionStore = makeSessionStore([ACCOUNT_A, ACCOUNT_B]);

    const result = await setCollectibleVisibility({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      collectible: PUNK,
      visibility: "visible",
      localStore,
      sessionStore,
    });

    expect(result).toEqual({ hiddenCollectibles: {} });
    expect(store[HIDDEN_COLLECTIBLE_LIST]).toEqual({
      [ACCOUNT_B]: { PUBLIC: [PUNK] },
    });
  });

  it("moves the old wallet-wide map to every account on every network", async () => {
    const { localStore, store } = makeLocalStore({
      [HIDDEN_COLLECTIBLES]: { [PUNK]: "hidden", [APE]: "visible" },
    });
    const sessionStore = makeSessionStore([ACCOUNT_A, ACCOUNT_B]);

    const result = await getHiddenCollectibles({
      publicKey: ACCOUNT_B,
      network: "TESTNET",
      localStore,
      sessionStore,
    });

    expect(result).toEqual({ hiddenCollectibles: { [PUNK]: "hidden" } });
    expect(store[HIDDEN_COLLECTIBLE_LIST]).toEqual({
      [ACCOUNT_A]: { PUBLIC: [PUNK], TESTNET: [PUNK] },
      [ACCOUNT_B]: { PUBLIC: [PUNK], TESTNET: [PUNK] },
    });
    expect(store[HIDDEN_COLLECTIBLES]).toBeUndefined();
  });

  it("keeps the old map until the session lists the accounts", async () => {
    const { localStore, store } = makeLocalStore({
      [HIDDEN_COLLECTIBLES]: { [PUNK]: "hidden" },
    });

    const result = await getHiddenCollectibles({
      publicKey: ACCOUNT_A,
      network: "PUBLIC",
      localStore,
      sessionStore: makeSessionStore([]),
    });

    expect(result).toEqual({ hiddenCollectibles: {} });
    expect(store[HIDDEN_COLLECTIBLES]).toEqual({ [PUNK]: "hidden" });
    expect(store[HIDDEN_COLLECTIBLE_LIST]).toBeUndefined();
  });
});
