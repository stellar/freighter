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

import { SERVICE_TYPES } from "@shared/constants/services";
import { ROUTES } from "popup/constants/routes";
import { reducer as authReducer } from "popup/ducks/accountServices";
import { SessionLockListener } from "../SessionLockListener";

type RuntimeHandler = (message: unknown) => void;

const listeners: RuntimeHandler[] = [];

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

describe("SessionLockListener", () => {
  beforeEach(() => {
    listeners.length = 0;
    lastLocation = null;
    jest.clearAllMocks();
  });

  it("registers a runtime.onMessage listener on mount and removes it on unmount", () => {
    const { unmount } = renderListener();

    expect(browser.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(listeners.length).toBeGreaterThanOrEqual(1);

    unmount();
    expect(browser.runtime.onMessage.removeListener).toHaveBeenCalled();
    expect(listeners).toHaveLength(0);
  });

  it("dispatches lockAccount and navigates to unlockAccount on SESSION_LOCKED", () => {
    const store = makeStore();
    renderListener("/", store);

    act(() => {
      listeners[listeners.length - 1]({
        type: SERVICE_TYPES.SESSION_LOCKED,
      });
    });

    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(false);
    expect(auth.publicKey).toBe("");
    expect(auth.allAccounts).toEqual([]);
    expect(lastLocation?.pathname).toBe(ROUTES.unlockAccount);
  });

  it("preserves the originating route as state.from and forwards location.search", () => {
    const store = makeStore();
    const originalEntry = `${ROUTES.grantAccess}?domain=example.com&public=GA1`;
    renderListener(originalEntry, store);

    act(() => {
      listeners[listeners.length - 1]({
        type: SERVICE_TYPES.SESSION_LOCKED,
      });
    });

    expect(lastLocation?.pathname).toBe(ROUTES.unlockAccount);
    expect(lastLocation?.search).toBe("?domain=example.com&public=GA1");
    const state = lastLocation?.state as { from?: { pathname?: string } };
    expect(state?.from?.pathname).toBe(ROUTES.grantAccess);
  });

  it("does not re-navigate or clobber state when already on the unlock screen", () => {
    const store = makeStore();
    renderListener(ROUTES.unlockAccount, store);
    const initialState = lastLocation?.state;

    act(() => {
      listeners[listeners.length - 1]({
        type: SERVICE_TYPES.SESSION_LOCKED,
      });
    });

    // Reducer is not dispatched and no navigation happens.
    expect(store.getState().auth.hasPrivateKey).toBe(true);
    expect(lastLocation?.pathname).toBe(ROUTES.unlockAccount);
    expect(lastLocation?.state).toBe(initialState);
  });

  it("ignores unrelated messages", () => {
    const store = makeStore();
    renderListener("/", store);

    act(() => {
      listeners[listeners.length - 1]({
        type: SERVICE_TYPES.LOAD_ACCOUNT,
      });
      listeners[listeners.length - 1]("not an object");
      listeners[listeners.length - 1](null);
    });

    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(true);
    expect(auth.publicKey).toBe("GBTEST");
    expect(lastLocation?.pathname).toBe("/");
  });
});
