import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { Wrapper } from "popup/__testHelpers__";

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

const pool = {
  id: "CAJJ",
  name: "Fixed Pool v2",
  status: "ACTIVE",
  suppliedUsd: 50050000,
  borrowedUsd: 16150000,
  interestApy: 0.0424,
  netApy: 0.1694,
  backstopUsd: 1530000,
  reserves: [],
} as never;

const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

const usdcSupply = {
  assetId: USDC_SAC,
  symbol: "USDC",
  name: "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
  decimals: 7,
  suppliedTokens: "0",
  collateralTokens: "5001223000",
  totalTokens: "5001223000",
  usdValue: 500.12,
  apy: 0.1694,
  emissionsApr: 0,
  interestEarned: "1234000",
  interestEarnedUsd: 0.12,
  claimableBlnd: "0",
  claimableUsd: null,
  priceUsd: 1,
};

const position = {
  protocol: "blend",
  id: "CAJJ",
  name: "Fixed Pool v2",
  netUsd: 500.12,
  suppliedUsd: 500.12,
  borrowedUsd: 0,
  netApy: 0.1694,
  blend: { supply: [usdcSupply], borrow: [] },
} as never;

const renderSheet = (props = {}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <PoolDetailsSheet pool={pool} onClose={jest.fn()} {...props} />
    </Wrapper>,
  );

describe("PoolDetailsSheet", () => {
  it("renders untabbed with a Close button when there is no position", () => {
    // The deposit flow's existing entry point. Nothing about it may change.
    renderSheet();

    expect(
      screen.queryByTestId("earn-pool-details-tabs"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByTestId("earn-pool-interest-apy")).toBeInTheDocument();
  });

  it("shows both tabs once the account has a position in the pool", () => {
    renderSheet({ position, focusedAssetId: USDC_SAC, onDeposit: jest.fn() });

    expect(screen.getByTestId("earn-pool-details-tabs")).toBeInTheDocument();
    expect(screen.getByText("Your position")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("renders untabbed when focusedAssetId names an asset the position doesn't hold (I2)", () => {
    // EarnAmount always names the asset it is depositing. A mismatch means the
    // account has no position in THAT asset yet -- the same "no position"
    // treatment as the no-position case above, not a tab with an empty panel.
    const XLM_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
    renderSheet({ position, focusedAssetId: XLM_SAC, onDeposit: jest.fn() });

    expect(
      screen.queryByTestId("earn-pool-details-tabs"),
    ).not.toBeInTheDocument();
    // Falls through to the Overview body, same as the no-position case.
    expect(screen.getByTestId("earn-pool-interest-apy")).toBeInTheDocument();
    expect(screen.queryByTestId("earn-position-panel")).not.toBeInTheDocument();
  });

  it("swaps Close for Deposit only when a deposit handler is supplied", () => {
    const onDeposit = jest.fn();
    renderSheet({ position, onDeposit });

    fireEvent.click(screen.getByText("Deposit"));
    expect(onDeposit).toHaveBeenCalled();
  });

  it("labels the rate APY, not APR", () => {
    // Every frame reads "Earn APR"; APY is what the backend returns.
    renderSheet({ position, onDeposit: jest.fn() });

    expect(screen.getByText("Earn APY")).toBeInTheDocument();
    expect(screen.queryByText("Earn APR")).not.toBeInTheDocument();
  });

  it("opens on the tab the caller asked for", () => {
    renderSheet({ position, defaultTab: "overview", onDeposit: jest.fn() });

    expect(screen.getByTestId("earn-pool-interest-apy")).toBeInTheDocument();
  });

  it("reports a tab change once, and never on mount", () => {
    const onTabChange = jest.fn();
    renderSheet({ position, onTabChange, onDeposit: jest.fn() });

    expect(onTabChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Overview"));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith("overview");

    // Tapping the tab already active is not a change.
    fireEvent.click(screen.getByText("Overview"));
    expect(onTabChange).toHaveBeenCalledTimes(1);
  });

  it("hides the tabs and shows Overview alone when overviewOnly is set", () => {
    // "About pool" asks about the pool. The account may well have a position,
    // but that is not what was asked.
    renderSheet({ position, overviewOnly: true, onDeposit: jest.fn() });

    expect(
      screen.queryByTestId("earn-pool-details-tabs"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("earn-pool-interest-apy")).toBeInTheDocument();
    expect(screen.queryByTestId("earn-position-panel")).not.toBeInTheDocument();
  });

  it("keeps the CTA as Close in overviewOnly, even with a deposit handler", () => {
    const onDeposit = jest.fn();
    renderSheet({ position, overviewOnly: true, onDeposit });

    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.queryByText("Deposit")).not.toBeInTheDocument();
  });
});
