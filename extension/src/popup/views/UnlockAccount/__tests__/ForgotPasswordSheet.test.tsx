import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as ApiInternal from "@shared/api/internal";
import { METRICS_DATA, METRICS_USER_ID } from "constants/localStorageTypes";
import { Wrapper } from "popup/__testHelpers__";
import * as IsSidebarModeHelpers from "popup/helpers/isSidebarMode";
import * as navigateHelpers from "popup/helpers/navigate";
import { ForgotPasswordSheet } from "popup/views/UnlockAccount/ForgotPasswordSheet";

// What an unlocked wallet leaves in page storage: the analytics id derived from
// its recovery phrase (64 hex characters), not the random bootstrap id.
const WALLET_DERIVED_USER_ID = "a".repeat(64);

const renderSheet = () => {
  const onClose = jest.fn();
  render(
    <Wrapper state={{}} routes={["/"]}>
      <ForgotPasswordSheet isOpen onClose={onClose} />
    </Wrapper>,
  );
  return { onClose };
};

// Lets a test decide when a mocked call answers.
const deferResponse = (spy: jest.SpyInstance) => {
  let respond: (value: { error?: string }) => void = () => {};
  spy.mockImplementation(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  );
  return (value: { error?: string }) => respond(value);
};

describe("ForgotPasswordSheet", () => {
  let closeWindowSpy: jest.SpyInstance;
  let isSidebarModeSpy: jest.SpyInstance;
  let openTabSpy: jest.SpyInstance;
  let resetWalletSpy: jest.SpyInstance;

  beforeEach(() => {
    // Stubbed, not just spied: jsdom's real window.close() empties the document.
    closeWindowSpy = jest
      .spyOn(navigateHelpers, "closeWindow")
      .mockImplementation(() => undefined);
    // Outside the sidebar unless a test says otherwise.
    isSidebarModeSpy = jest
      .spyOn(IsSidebarModeHelpers, "isSidebarMode")
      .mockReturnValue(false);
    openTabSpy = jest
      .spyOn(navigateHelpers, "openTab")
      .mockResolvedValue({} as any);
    resetWalletSpy = jest
      .spyOn(ApiInternal, "resetWallet")
      .mockResolvedValue({});
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the reset warning with a red info badge", () => {
    renderSheet();

    expect(screen.getByText("Forgot your password?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your password is stored only on this device and can’t be recovered.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You can reset Varial with your recovery phrase, set a new password, and re-import.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Make sure you have your recovery phrase before continuing.",
      ),
    ).toHaveClass("ForgotPasswordSheet__reminder");
    expect(
      screen
        .getByTestId("forgot-password-sheet")
        .querySelector(".InfoSheet__badge--error"),
    ).not.toBeNull();
    expect(screen.getByTestId("forgot-password-sheet-reset")).toHaveTextContent(
      "Reset wallet",
    );
  });

  it("closes from the X without erasing anything", async () => {
    const { onClose } = renderSheet();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(resetWalletSpy).not.toHaveBeenCalled();
  });

  it("erases the wallet, clears page metrics and the analytics id, closes and opens the Welcome tab", async () => {
    localStorage.setItem(METRICS_DATA, JSON.stringify({ hwExists: true }));
    localStorage.setItem(METRICS_USER_ID, WALLET_DERIVED_USER_ID);
    const { onClose } = renderSheet();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-reset"));

    await waitFor(() =>
      expect(openTabSpy).toHaveBeenCalledWith("index.html#/welcome"),
    );
    expect(resetWalletSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(METRICS_DATA)).toBeNull();
    // The Welcome tab and the next wallet's onboarding must not be reported
    // under the erased wallet's identity.
    expect(localStorage.getItem(METRICS_USER_ID)).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the sheet open with an error when the erase fails", async () => {
    resetWalletSpy.mockResolvedValue({ error: "Failed to reset wallet" });
    localStorage.setItem(METRICS_DATA, JSON.stringify({ hwExists: true }));
    localStorage.setItem(METRICS_USER_ID, WALLET_DERIVED_USER_ID);
    const { onClose } = renderSheet();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-reset"));

    expect(
      await screen.findByText("Couldn’t reset your wallet. Try again."),
    ).toBeInTheDocument();
    expect(openTabSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // The wallet is still there, so its page storage stays too.
    expect(localStorage.getItem(METRICS_DATA)).not.toBeNull();
    expect(localStorage.getItem(METRICS_USER_ID)).toBe(WALLET_DERIVED_USER_ID);
    expect(screen.getByTestId("forgot-password-sheet-reset")).toBeEnabled();
  });

  it("erases once when Reset wallet is pressed twice", async () => {
    const respond = deferResponse(resetWalletSpy);
    renderSheet();
    const reset = screen.getByTestId("forgot-password-sheet-reset");

    await userEvent.click(reset);
    await userEvent.click(reset);
    await act(async () => respond({}));

    await waitFor(() => expect(openTabSpy).toHaveBeenCalledTimes(1));
    expect(resetWalletSpy).toHaveBeenCalledTimes(1);
  });

  it("still opens the Welcome tab when the sheet is closed mid-erase", async () => {
    const respond = deferResponse(resetWalletSpy);
    renderSheet();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-reset"));
    await userEvent.click(screen.getByTestId("forgot-password-sheet-close"));
    await act(async () => respond({}));

    await waitFor(() =>
      expect(openTabSpy).toHaveBeenCalledWith("index.html#/welcome"),
    );
  });

  it("closes the side panel once the Welcome tab has opened", async () => {
    isSidebarModeSpy.mockReturnValue(true);
    const finishOpeningTab = deferResponse(openTabSpy);
    renderSheet();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-reset"));
    await waitFor(() =>
      expect(openTabSpy).toHaveBeenCalledWith("index.html#/welcome"),
    );
    // The tab is still being created.
    expect(closeWindowSpy).not.toHaveBeenCalled();

    await act(async () => finishOpeningTab({}));

    await waitFor(() => expect(closeWindowSpy).toHaveBeenCalledTimes(1));
  });

  it("leaves the window open after a reset outside the side panel", async () => {
    renderSheet();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-reset"));

    await waitFor(() =>
      expect(openTabSpy).toHaveBeenCalledWith("index.html#/welcome"),
    );
    expect(closeWindowSpy).not.toHaveBeenCalled();
  });

  it("keeps the side panel open, with the error, when the erase fails", async () => {
    isSidebarModeSpy.mockReturnValue(true);
    resetWalletSpy.mockResolvedValue({ error: "Failed to reset wallet" });
    renderSheet();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-reset"));

    expect(
      await screen.findByText("Couldn’t reset your wallet. Try again."),
    ).toBeInTheDocument();
    expect(openTabSpy).not.toHaveBeenCalled();
    expect(closeWindowSpy).not.toHaveBeenCalled();
  });
});
