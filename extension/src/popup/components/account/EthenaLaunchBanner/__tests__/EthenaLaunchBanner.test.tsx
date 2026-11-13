import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { captureException } from "@sentry/browser";

import * as ApiInternal from "@shared/api/internal";
import { ROUTES } from "popup/constants/routes";
import { Wrapper } from "popup/__testHelpers__";
import { EthenaLaunchBanner } from "popup/components/account/EthenaLaunchBanner";

jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

const renderBanner = () =>
  render(
    <Wrapper state={{}} routes={[ROUTES.account]}>
      <Routes>
        <Route path={ROUTES.account} element={<EthenaLaunchBanner />} />
        <Route
          path={ROUTES.ethenaLaunch}
          element={<div data-testid="ethena-launch-stub" />}
        />
      </Routes>
    </Wrapper>,
  );

describe("EthenaLaunchBanner", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("shows the launch until it's dismissed", async () => {
    jest
      .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
      .mockResolvedValue(false);
    renderBanner();

    expect(
      await screen.findByTestId("ethena-launch-banner"),
    ).toBeInTheDocument();
    expect(screen.getByText("Meet Ethena on Stellar")).toBeInTheDocument();
    expect(
      screen.getByText("USDe and sUSDe are now available."),
    ).toBeInTheDocument();
  });

  it("stays hidden once dismissed", async () => {
    const lookup = jest
      .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
      .mockResolvedValue(true);
    renderBanner();

    await waitFor(() => expect(lookup).toHaveBeenCalled());
    expect(screen.queryByTestId("ethena-launch-banner")).toBeNull();
  });

  it("stays hidden when the dismissal can't be looked up", async () => {
    const error = new Error("no background");
    jest
      .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
      .mockRejectedValue(error);
    renderBanner();

    await waitFor(() => expect(captureException).toHaveBeenCalledWith(error));
    expect(screen.queryByTestId("ethena-launch-banner")).toBeNull();
  });

  it("hides and remembers the dismissal", async () => {
    jest
      .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
      .mockResolvedValue(false);
    const dismiss = jest
      .spyOn(ApiInternal, "dismissEthenaLaunchBanner")
      .mockResolvedValue({ isDismissed: true });
    renderBanner();

    await userEvent.click(
      await screen.findByTestId("ethena-launch-banner-dismiss"),
    );

    expect(dismiss).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId("ethena-launch-banner")).toBeNull(),
    );
  });

  it("opens the full-screen promo", async () => {
    jest
      .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
      .mockResolvedValue(false);
    renderBanner();

    await userEvent.click(
      await screen.findByTestId("ethena-launch-banner-open"),
    );

    expect(await screen.findByTestId("ethena-launch-stub")).toBeInTheDocument();
  });
});
