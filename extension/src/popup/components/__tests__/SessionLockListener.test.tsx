import React from "react";
import { render, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import browser from "webextension-polyfill";

import { loadAccount } from "@shared/api/internal";
import { SERVICE_TYPES } from "@shared/constants/services";
import { ROUTES } from "popup/constants/routes";
import { reducer as authReducer } from "popup/ducks/accountServices";
import { SessionLockListener } from "../SessionLockListener";

type RuntimeHandler = (message: unknown) => void | Promise<void>;

const listeners: RuntimeHandler[] = [];
const mockLoadAccount = loadAccount as jest.MockedFunction<typeof loadAccount>;

jest.mock("webextension-polyfill", () => ({
  runtime: {
    onMessage: {
      addListener: jest.fn((h: RuntimeHandler) => listeners.push(h)),
      removeListener: jest.fn((h: RuntimeHandler) => {
        const idx = listeners.indexOf(h);
        if (idx >= 0) listeners.splice(idx, 1);
      }),
    },
  },
}));

jest.mock("@shared/api/internal", () => ({
  loadAccount: jest.fn(),
}));

const makeStore = () =>
  configureStore({
    reducer: combineReducers({ auth: authReducer }),
    preloadedState: {
      auth: {
        allAccounts: [{ publicKey: "GBTEST" } as any],
        migratedAccounts: [],
        applicationState: "MNEMONIC_PHRASE_CONFIRMED",
        hasPrivateKey: true,
        publicKey: "GBTEST",
        connectingWalletType: "NONE",
        bipPath: "m/0",
        tokenIdList: [],
        error: "",
        accountStatus: "IDLE",
        isAccountMismatch: false,
      },
    } as any,
  });

const loadedAccount = {
  allAccounts: [{ publicKey: "GBUPDATED" } as any],
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  bipPath: "m/44'/148'/1'",
  hasPrivateKey: true,
  publicKey: "GBUPDATED",
  tokenIdList: ["token2"],
} as Awaited<ReturnType<typeof loadAccount>>;

let lastLocation: ReturnType<typeof useLocation> | null = null;
const LocationSpy = () => {
  lastLocation = useLocation();
  return null;
};

const renderListener = (
  initialEntry: string = "/",
  store = makeStore(),
) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SessionLockListener />
        <LocationSpy />
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

const emitMessage = async (message: unknown) => {
  await act(async () => {
    await listeners[listeners.length - 1](message);
  });
};

describe("SessionLockListener", () => {
  beforeEach(() => {
    listeners.length = 0;
    lastLocation = null;
    jest.clearAllMocks();
    mockLoadAccount.mockResolvedValue(loadedAccount);
  });

  it("registers a runtime.onMessage listener on mount and removes it on unmount", () => {
    const { unmount } = renderListener();

    expect(browser.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(listeners.length).toBeGreaterThanOrEqual(1);

    unmount();
    expect(browser.runtime.onMessage.removeListener).toHaveBeenCalled();
    expect(listeners).toHaveLength(0);
  });

  it("dispatches lockAccount and navigates to unlockAccount on SESSION_LOCKED", async () => {
    const store = makeStore();
    renderListener("/", store);

    await emitMessage({ type: SERVICE_TYPES.SESSION_LOCKED });

    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(false);
    expect(auth.publicKey).toBe("");
    expect(auth.allAccounts).toEqual([]);
    expect(lastLocation?.pathname).toBe(ROUTES.unlockAccount);
  });

  it("preserves the originating route as state.from and forwards location.search", async () => {
    const store = makeStore();
    const originalEntry = `${ROUTES.grantAccess}?domain=example.com&public=GA1`;
    renderListener(originalEntry, store);

    await emitMessage({ type: SERVICE_TYPES.SESSION_LOCKED });

    expect(lastLocation?.pathname).toBe(ROUTES.unlockAccount);
    expect(lastLocation?.search).toBe("?domain=example.com&public=GA1");
    const state = lastLocation?.state as { from?: { pathname?: string } };
    expect(state?.from?.pathname).toBe(ROUTES.grantAccess);
  });

  it("does not re-navigate or clobber state when already on the unlock screen", async () => {
    const store = makeStore();
    renderListener(ROUTES.unlockAccount, store);
    const initialState = lastLocation?.state;

    await emitMessage({ type: SERVICE_TYPES.SESSION_LOCKED });

    // Reducer is not dispatched and no navigation happens.
    expect(store.getState().auth.hasPrivateKey).toBe(true);
    expect(lastLocation?.pathname).toBe(ROUTES.unlockAccount);
    expect(lastLocation?.state).toBe(initialState);
  });

  it("loads and saves account data on SESSION_UNLOCKED", async () => {
    const store = makeStore();
    renderListener("/", store);

    await emitMessage({ type: SERVICE_TYPES.SESSION_UNLOCKED });

    expect(mockLoadAccount).toHaveBeenCalledTimes(1);
    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(true);
    expect(auth.publicKey).toBe("GBUPDATED");
    expect(auth.allAccounts).toEqual([{ publicKey: "GBUPDATED" }]);
  });

  it("navigates to account from unlockAccount on SESSION_UNLOCKED", async () => {
    renderListener(ROUTES.unlockAccount);

    await emitMessage({ type: SERVICE_TYPES.SESSION_UNLOCKED });

    expect(lastLocation?.pathname).toBe(ROUTES.account);
  });

  it("navigates to account from verifyAccount on SESSION_UNLOCKED", async () => {
    renderListener(ROUTES.verifyAccount);

    await emitMessage({ type: SERVICE_TYPES.SESSION_UNLOCKED });

    expect(lastLocation?.pathname).toBe(ROUTES.account);
  });

  it("does not navigate from a non-lock route on SESSION_UNLOCKED", async () => {
    renderListener(ROUTES.settings);

    await emitMessage({ type: SERVICE_TYPES.SESSION_UNLOCKED });

    expect(lastLocation?.pathname).toBe(ROUTES.settings);
  });

  it("ignores unrelated messages", async () => {
    const store = makeStore();
    renderListener("/", store);

    await emitMessage({ type: SERVICE_TYPES.LOAD_ACCOUNT });
    await emitMessage("not an object");
    await emitMessage(null);

    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(true);
    expect(auth.publicKey).toBe("GBTEST");
    expect(lastLocation?.pathname).toBe("/");
  });
});
