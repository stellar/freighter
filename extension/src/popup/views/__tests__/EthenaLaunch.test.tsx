import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { Wrapper } from "popup/__testHelpers__";
import { EthenaLaunch } from "popup/views/EthenaLaunch";

jest.mock("popup/helpers/navigate", () => ({
  ...jest.requireActual("popup/helpers/navigate"),
  openTab: jest.fn(),
}));

// The global mock returns keys verbatim; the per-token labels need their
// {{code}} filled in to be told apart.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values: Record<string, string> = {}) =>
      Object.entries(values).reduce(
        (text, [name, value]) => text.split(`{{${name}}}`).join(value),
        key,
      ),
  }),
}));

const { openTab } = jest.requireMock<typeof import("popup/helpers/navigate")>(
  "popup/helpers/navigate",
);

const SUSHI_STELLAR_SWAP_URL = "https://www.sushi.com/stellar/swap";
const STARGATE_USDE_URL =
  "https://stargate.finance/?srcChain=ethereum&srcToken=0x4c9EDD5852cd905f086C759E8383e09bff1E68B3&dstChain=stellar&dstToken=CCNOV6XVI2O5BSTA3232GIRUQULDEBV7IWGKM6QKI6II5OIIQTU24JJN";
const STARGATE_SUSDE_URL =
  "https://stargate.finance/?srcChain=ethereum&srcToken=0x9D39A5DE30e57443BfF2A8307A4256c8797A3497&dstChain=stellar&dstToken=CACSKWC753QVGC4J6YPDBIR2BEHFVWIAE7CBSS3HOVYMN623OAIQYE2M";

const renderView = (destination?: string) =>
  render(
    <Wrapper
      state={{}}
      routes={[
        {
          pathname: ROUTES.ethenaLaunch,
          state: destination ? { destination } : undefined,
        },
      ]}
    >
      <Routes>
        <Route path={ROUTES.ethenaLaunch} element={<EthenaLaunch />} />
        <Route path={ROUTES.account} element={<div>account-home</div>} />
        <Route path={ROUTES.settings} element={<div>settings-home</div>} />
        <Route
          path={ROUTES.viewPublicKey}
          element={<div>view-public-key</div>}
        />
      </Routes>
    </Wrapper>,
  );

describe("EthenaLaunch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("introduces Ethena and both of its tokens", () => {
    renderView();

    expect(
      screen.getByRole("heading", { name: "Meet Ethena on Stellar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Discover USDe and sUSDe, now available on Stellar."),
    ).toBeInTheDocument();
    expect(screen.getByText("Scroll to discover tokens")).toBeInTheDocument();
    expect(screen.getByText("Synthetic Dollar")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A synthetic dollar designed to maintain a value of $1.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Staked USDe")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A staked version of USDe that accrues variable protocol rewards.",
      ),
    ).toBeInTheDocument();
  });

  it("stays on the dark theme whatever the app theme is", () => {
    renderView();

    expect(screen.getByTestId("ethena-launch")).toHaveClass("sds-theme-dark");
  });

  it("swaps on Sushi for either token", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-swap-usde"));
    await userEvent.click(screen.getByTestId("ethena-launch-swap-susde"));

    expect(screen.getByTestId("ethena-launch-swap-usde")).toHaveTextContent(
      "Swap to USDe",
    );
    expect(screen.getByTestId("ethena-launch-swap-susde")).toHaveTextContent(
      "Swap to sUSDe",
    );
    expect(openTab).toHaveBeenNthCalledWith(1, SUSHI_STELLAR_SWAP_URL);
    expect(openTab).toHaveBeenNthCalledWith(2, SUSHI_STELLAR_SWAP_URL);
  });

  it("transfers each token to Stellar through Stargate", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-transfer-usde"));
    await userEvent.click(screen.getByTestId("ethena-launch-transfer-susde"));

    expect(openTab).toHaveBeenNthCalledWith(1, STARGATE_USDE_URL);
    expect(openTab).toHaveBeenNthCalledWith(2, STARGATE_SUSDE_URL);
  });

  it("receives USDe on the wallet's address screen", async () => {
    renderView();

    expect(screen.getByTestId("ethena-launch-receive-usde")).toHaveTextContent(
      "Receive USDe",
    );
    await userEvent.click(screen.getByTestId("ethena-launch-receive-usde"));

    expect(await screen.findByText("view-public-key")).toBeInTheDocument();
  });

  it("receives sUSDe on the wallet's address screen", async () => {
    renderView();

    expect(screen.getByTestId("ethena-launch-receive-susde")).toHaveTextContent(
      "Receive sUSDe",
    );
    await userEvent.click(screen.getByTestId("ethena-launch-receive-susde"));

    expect(await screen.findByText("view-public-key")).toBeInTheDocument();
  });

  it("links out to Ethena's docs", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-learn-more"));

    expect(openTab).toHaveBeenCalledWith("https://docs.ethena.fi/");
  });

  it("closes to the destination it was given", async () => {
    renderView(ROUTES.settings);

    await userEvent.click(screen.getByTestId("ethena-launch-close"));

    expect(await screen.findByText("settings-home")).toBeInTheDocument();
  });

  it("closes to the account view when no destination was given", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-close"));

    expect(await screen.findByText("account-home")).toBeInTheDocument();
  });
});
