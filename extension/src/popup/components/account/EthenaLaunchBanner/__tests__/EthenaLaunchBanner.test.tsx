import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { captureException } from "@sentry/browser";

import * as ApiInternal from "@shared/api/internal";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";
import { emitMetric } from "helpers/metrics";
import { ROUTES } from "popup/constants/routes";
import { Wrapper } from "popup/__testHelpers__";
import { EthenaLaunchBanner } from "popup/components/account/EthenaLaunchBanner";

jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

// A network the user added, pointed at Mainnet: still a custom network.
const CUSTOM_MAINNET_NETWORK_DETAILS: NetworkDetails = {
  ...MAINNET_NETWORK_DETAILS,
  network: CUSTOM_NETWORK,
  networkName: "My Mainnet node",
  networkUrl: "https://horizon.example.com",
};

const renderBanner = (networkDetails = MAINNET_NETWORK_DETAILS) =>
  render(
    <Wrapper state={{ settings: { networkDetails } }} routes={[ROUTES.account]}>
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

  // USDe and sUSDe, and the pages the promo links to, are Mainnet's.
  it.each([
    ["Testnet", TESTNET_NETWORK_DETAILS],
    ["Futurenet", FUTURENET_NETWORK_DETAILS],
    [
      "a custom network, even one pointing at Mainnet",
      CUSTOM_MAINNET_NETWORK_DETAILS,
    ],
  ])(
    "stays hidden on %s, without looking up its dismissal",
    (_networkName, networkDetails) => {
      const lookup = jest
        .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
        .mockResolvedValue(false);
      renderBanner(networkDetails);

      expect(lookup).not.toHaveBeenCalled();
      expect(screen.queryByTestId("ethena-launch-banner")).toBeNull();
    },
  );

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

  // The same event the mobile app reports, into the same project.
  it("reports the dismissal once the background has recorded it", async () => {
    jest
      .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
      .mockResolvedValue(false);
    jest
      .spyOn(ApiInternal, "dismissEthenaLaunchBanner")
      .mockResolvedValue({ isDismissed: true });
    renderBanner();

    await userEvent.click(
      await screen.findByTestId("ethena-launch-banner-dismiss"),
    );

    await waitFor(() =>
      expect(emitMetric).toHaveBeenCalledWith("ethena_launch.banner_dismissed"),
    );
  });

  it("doesn't report a dismissal the background didn't record", async () => {
    jest
      .spyOn(ApiInternal, "getEthenaLaunchBannerDismissed")
      .mockResolvedValue(false);
    const error = new Error("no background");
    jest
      .spyOn(ApiInternal, "dismissEthenaLaunchBanner")
      .mockRejectedValue(error);
    renderBanner();

    await userEvent.click(
      await screen.findByTestId("ethena-launch-banner-dismiss"),
    );

    await waitFor(() => expect(captureException).toHaveBeenCalledWith(error));
    expect(emitMetric).not.toHaveBeenCalledWith(
      "ethena_launch.banner_dismissed",
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
