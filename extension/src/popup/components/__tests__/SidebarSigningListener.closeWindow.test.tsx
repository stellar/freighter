import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { closeWindow } from "popup/helpers/navigate";
import { SidebarSigningListener } from "../SidebarSigningListener";

jest.mock("webextension-polyfill", () => ({
  runtime: {
    connect: jest.fn(() => ({
      postMessage: jest.fn(),
      disconnect: jest.fn(),
      onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    })),
  },
  windows: { getCurrent: jest.fn(() => Promise.resolve({ id: 1 })) },
}));

const jsdomClose = window.close;

let currentPath = "";
const LocationSpy = () => {
  currentPath = useLocation().pathname;
  return null;
};

const renderListener = () =>
  render(
    <MemoryRouter initialEntries={[ROUTES.settings]}>
      <SidebarSigningListener />
      <LocationSpy />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );

describe("SidebarSigningListener and closeWindow", () => {
  afterEach(() => {
    // Unmounting puts back the window.close the listener saw, which here is a
    // wrapper around a spy; leave the real jsdom one for the next test.
    cleanup();
    jest.restoreAllMocks();
    window.close = jsdomClose;
  });

  it("lets closeWindow close the window for real while window.close still navigates home", () => {
    const nativeClose = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);
    renderListener();

    act(() => {
      closeWindow();
    });

    expect(nativeClose).toHaveBeenCalledTimes(1);
    expect(currentPath).toBe(ROUTES.settings);

    // The override stays: signing flows rely on it.
    act(() => {
      window.close();
    });

    expect(currentPath).toBe(ROUTES.account);
    expect(nativeClose).toHaveBeenCalledTimes(1);
  });

  it("stops handing the native close over once it unmounts", () => {
    const nativeClose = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);
    const { unmount } = renderListener();
    unmount();

    // If the listener had not forgotten the native close, closeWindow would
    // still call that one and never reach this later window.close.
    const laterClose = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);

    closeWindow();

    expect(laterClose).toHaveBeenCalledTimes(1);
    expect(nativeClose).not.toHaveBeenCalled();
  });
});
