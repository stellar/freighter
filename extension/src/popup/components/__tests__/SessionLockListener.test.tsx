import React from "react";
import { render, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
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

let currentPath = "/";
const PathSpy = () => {
  const location = useLocation();
  currentPath = location.pathname;
  return null;
};

const renderListener = (store = makeStore()) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/"]}>
        <SessionLockListener />
        <PathSpy />
        <Routes>
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe("SessionLockListener", () => {
  beforeEach(() => {
    listeners.length = 0;
    currentPath = "/";
    jest.clearAllMocks();
  });

  it("registers a runtime.onMessage listener on mount and removes it on unmount", () => {
    const { unmount } = renderListener();

    expect(browser.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(listeners).toHaveLength(1);

    unmount();
    expect(browser.runtime.onMessage.removeListener).toHaveBeenCalledTimes(1);
    expect(listeners).toHaveLength(0);
  });

  it("dispatches lockAccount and navigates to unlockAccount on SESSION_LOCKED", () => {
    const store = makeStore();
    renderListener(store);

    act(() => {
      listeners[0]({ type: SERVICE_TYPES.SESSION_LOCKED });
    });

    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(false);
    expect(auth.publicKey).toBe("");
    expect(auth.allAccounts).toEqual([]);
    expect(currentPath).toBe(ROUTES.unlockAccount);
  });

  it("ignores unrelated messages", () => {
    const store = makeStore();
    renderListener(store);

    act(() => {
      listeners[0]({ type: SERVICE_TYPES.LOAD_ACCOUNT });
      listeners[0]("not an object");
      listeners[0](null);
    });

    const { auth } = store.getState();
    expect(auth.hasPrivateKey).toBe(true);
    expect(auth.publicKey).toBe("GBTEST");
    expect(currentPath).toBe("/");
  });
});
