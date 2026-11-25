import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { Wrapper } from "popup/__testHelpers__";
import { Welcome } from "popup/views/Welcome";

const renderWelcome = () =>
  render(
    <Wrapper routes={[ROUTES.welcome]} state={{}}>
      <Routes>
        <Route path={ROUTES.welcome} element={<Welcome />} />
        <Route
          path={ROUTES.accountCreator}
          element={<div data-testid="account-creator-stub" />}
        />
        <Route
          path={ROUTES.recoverAccount}
          element={<div data-testid="recover-account-stub" />}
        />
      </Routes>
    </Wrapper>,
  );

describe("Welcome", () => {
  it("shows the Varial welcome", () => {
    renderWelcome();

    expect(
      screen.getByRole("img", { name: "Varial logo" }),
    ).toBeInTheDocument();
    // The gray subtitle is part of the display type, not a second heading.
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Varial" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your favorite Stellar wallet"),
    ).toBeInTheDocument();
    expect(screen.getByText("Freighter is now Varial")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create new wallet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Import wallet" }),
    ).toBeInTheDocument();
  });

  it("starts a new wallet from Create new wallet", async () => {
    renderWelcome();

    await userEvent.click(
      screen.getByRole("button", { name: "Create new wallet" }),
    );

    expect(screen.getByTestId("account-creator-stub")).toBeInTheDocument();
  });

  it("imports a wallet from Import wallet", async () => {
    renderWelcome();

    await userEvent.click(
      screen.getByRole("button", { name: "Import wallet" }),
    );

    expect(screen.getByTestId("recover-account-stub")).toBeInTheDocument();
  });
});
