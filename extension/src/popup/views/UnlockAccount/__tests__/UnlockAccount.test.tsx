import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";

import * as ApiInternal from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { TEST_PUBLIC_KEY, Wrapper, mockAccounts } from "popup/__testHelpers__";
import { UnlockAccount } from "popup/views/UnlockAccount";

const lockedAuth = {
  error: null,
  applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  publicKey: "",
  hasPrivateKey: false,
  allAccounts: [],
};

const unlockedResponse = {
  publicKey: TEST_PUBLIC_KEY,
  hasPrivateKey: true,
  applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  allAccounts: mockAccounts,
  bipPath: "",
};

const renderLockScreen = (
  entry:
    | string
    | {
        pathname: string;
        search?: string;
        state?: unknown;
      } = ROUTES.unlockAccount,
) =>
  render(
    <Wrapper routes={[entry]} state={{ auth: lockedAuth }}>
      <Routes>
        <Route path={ROUTES.unlockAccount} element={<UnlockAccount />} />
        <Route
          path={ROUTES.account}
          element={<div data-testid="account-view-stub" />}
        />
        <Route
          path={ROUTES.grantAccess}
          element={<div data-testid="grant-access-stub" />}
        />
        <Route
          path={ROUTES.rebrandAnnouncement}
          element={<div data-testid="rebrand-announcement-stub" />}
        />
      </Routes>
    </Wrapper>,
  );

const typePasswordAndUnlock = async (password: string) => {
  await userEvent.type(screen.getByPlaceholderText("Password"), password);
  await userEvent.click(screen.getByTestId("enter-password-submit"));
};

describe("UnlockAccount", () => {
  beforeEach(() => {
    // Only wallets that pre-date the rebrand are owed the announcement.
    jest
      .spyOn(ApiInternal, "claimRebrandAnnouncement")
      .mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the redesigned lock screen", () => {
    renderLockScreen();

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Freighter is now Varial")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toHaveFocus();
    expect(screen.getByTestId("enter-password-submit")).toBeDisabled();
    expect(screen.getByTestId("forgot-password-button")).toHaveTextContent(
      "Forgot password",
    );
    expect(screen.queryByTestId("identicon-img")).toBeNull();
    expect(screen.queryByText("Import using account seed phrase")).toBeNull();
    expect(screen.queryByText("Create a wallet")).toBeNull();
  });

  it("keeps the show/hide password toggle", async () => {
    const { container } = renderLockScreen();
    const input = screen.getByPlaceholderText("Password");
    expect(input).toHaveAttribute("type", "password");

    await userEvent.click(
      container.querySelector(".PasswordMaskToggle") as HTMLElement,
    );

    expect(input).toHaveAttribute("type", "text");
  });

  it("unlocks and goes to the account view", async () => {
    const confirmSpy = jest
      .spyOn(ApiInternal, "confirmPassword")
      .mockResolvedValue(unlockedResponse as any);
    renderLockScreen();

    await typePasswordAndUnlock("my password");

    expect(await screen.findByTestId("account-view-stub")).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith("my password");
  });

  it("returns to the interrupted dApp request after unlocking", async () => {
    jest
      .spyOn(ApiInternal, "confirmPassword")
      .mockResolvedValue(unlockedResponse as any);
    renderLockScreen({
      pathname: ROUTES.unlockAccount,
      search: "?request=abc",
      state: { from: { pathname: ROUTES.grantAccess } },
    });

    await typePasswordAndUnlock("my password");

    expect(await screen.findByTestId("grant-access-stub")).toBeInTheDocument();
  });

  it("shows the one-time rebrand announcement to a wallet that's owed it", async () => {
    jest
      .spyOn(ApiInternal, "confirmPassword")
      .mockResolvedValue(unlockedResponse as any);
    jest.spyOn(ApiInternal, "claimRebrandAnnouncement").mockResolvedValue(true);
    renderLockScreen();

    await typePasswordAndUnlock("my password");

    expect(
      await screen.findByTestId("rebrand-announcement-stub"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("account-view-stub")).toBeNull();
  });

  it("shows Incorrect Password and stays locked on a wrong password", async () => {
    jest
      .spyOn(ApiInternal, "confirmPassword")
      .mockResolvedValue({ error: "Incorrect password" } as any);
    renderLockScreen();

    await typePasswordAndUnlock("wrong");

    expect(await screen.findByText("Incorrect Password")).toBeInTheDocument();
    expect(screen.queryByTestId("account-view-stub")).toBeNull();
  });

  it("opens and closes the Forgot password sheet", async () => {
    renderLockScreen();

    await userEvent.click(screen.getByTestId("forgot-password-button"));

    const sheet = screen.getByTestId("forgot-password-sheet");
    await waitFor(() =>
      expect(sheet.closest(".SlideupModal")).toHaveClass("open"),
    );
    expect(screen.getByPlaceholderText("Password")).not.toHaveFocus();

    await userEvent.click(screen.getByTestId("forgot-password-sheet-close"));

    await waitFor(() =>
      expect(sheet.closest(".SlideupModal")).toHaveClass("closed"),
    );
  });
});
