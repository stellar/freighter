import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  MAINNET_NETWORK_DETAILS,
  NETWORKS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { openTab } from "popup/helpers/navigate";
import { Wrapper } from "popup/__testHelpers__";

jest.mock("popup/helpers/navigate", () => ({
  ...jest.requireActual("popup/helpers/navigate"),
  openTab: jest.fn(),
}));

const pool: BlendCatalogPool = {
  id: BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!,
  name: "Fixed Pool v2",
  status: "ACTIVE",
  suppliedUsd: 50050000,
  borrowedUsd: 16150000,
  interestApy: 0.0424,
  netApy: 0.1694,
  backstopUsd: 1530000,
  reserves: [],
};

const renderSheet = (
  onClose = jest.fn(),
  networkDetails = TESTNET_NETWORK_DETAILS,
) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        settings: { networkDetails, assetsLists: {} },
      }}
    >
      <PoolDetailsSheet
        pool={pool}
        token={{ code: "USDC", issuer: undefined, icon: null, apy: 0.1694 }}
        onClose={onClose}
      />
    </Wrapper>,
  );

describe("PoolDetailsSheet", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders the pool-agnostic description for any pool", () => {
    renderSheet();
    expect(
      screen.getByText(
        "Deposit supported tokens into this Blend pool to earn yield. APY may change over time. Withdraw anytime.",
      ),
    ).toBeInTheDocument();
  });

  it("opens Blend's app for the network in a new tab", () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("earn-pool-app-link"));
    expect(openTab).toHaveBeenCalledWith("https://testnet.blend.capital/");
  });

  it("opens Blend's mainnet app on Mainnet", () => {
    renderSheet(jest.fn(), MAINNET_NETWORK_DETAILS);
    fireEvent.click(screen.getByTestId("earn-pool-app-link"));
    expect(openTab).toHaveBeenCalledWith("https://mainnet.blend.capital/");
  });

  it("shows the deposited token's rate as the current yield", () => {
    // The pool's own net APY blends every reserve; the rate the user earns is
    // the one for the token they deposit.
    renderSheet();
    expect(screen.getByTestId("earn-pool-deposit-apy")).toHaveTextContent(
      "16.94%",
    );
    expect(screen.getByText("Current yield")).toBeInTheDocument();
    expect(screen.getByText("Pool liquidity")).toBeInTheDocument();
  });
});
