import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AccountPositions } from "popup/components/account/AccountPositions";
import { TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";

jest.mock("popup/metrics/positions", () => ({
  trackPositionRowSelected: jest.fn(),
  trackPositionsEmptyCtaSelected: jest.fn(),
}));

const { trackPositionRowSelected } = jest.requireMock<
  typeof import("popup/metrics/positions")
>("popup/metrics/positions");

const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const XLM_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

const supply = (over: Record<string, unknown> = {}) => ({
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
  ...over,
});

const withSupply = (rows: unknown[]) =>
  ({
    address: TEST_PUBLIC_KEY,
    totalValueUsd: 620.16,
    netApy: 0.16,
    positions: [
      {
        protocol: "blend",
        id: POOL_ID,
        name: "Fixed Pool v2",
        netUsd: 620.16,
        suppliedUsd: 620.16,
        borrowedUsd: 0,
        netApy: 0.16,
        blend: { supply: rows, borrow: [] },
      },
    ],
    backstop: [],
  }) as never;

const twoAssetPositions = withSupply([
  supply(),
  supply({ assetId: XLM_SAC, symbol: null, name: null, usdValue: 120.04 }),
]);
const unpricedPositions = withSupply([supply({ usdValue: null })]);

const noPositions = {
  address: TEST_PUBLIC_KEY,
  totalValueUsd: null,
  netApy: null,
  positions: [],
  backstop: [],
} as never;

// The null/zero/positive boundary on interestEarnedUsd: a positive figure is
// a real gain (colored), a flat zero is real but not a gain (shown, not
// colored), and null is unavailable (shown as --, not colored either).
const positiveGainPositions = withSupply([supply()]);
const zeroGainPositions = withSupply([supply({ interestEarnedUsd: 0 })]);
const unavailableGainPositions = withSupply([
  supply({ interestEarnedUsd: null }),
]);
const unavailableRatePositions = withSupply([supply({ apy: null })]);

const renderTab = (
  props: Partial<React.ComponentProps<typeof AccountPositions>>,
) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <AccountPositions
        positions={null}
        isLoading={false}
        hasError={false}
        assetIcons={{}}
        networkDetails={MAINNET_NETWORK_DETAILS}
        projectedUsd={null}
        bestApy={null}
        onStartEarning={() => {}}
        pools={[]}
        onDeposit={() => {}}
        {...props}
      />
    </Wrapper>,
  );

describe("AccountPositions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("spins while the request is in flight", () => {
    renderTab({ isLoading: true });

    expect(screen.getByTestId("account-positions-loader")).toBeInTheDocument();
    expect(screen.queryByText("No positions yet")).not.toBeInTheDocument();
  });

  it("shows an error rather than claiming the account has none", () => {
    // "Could not load" and "you have none" are different answers. Rendering the
    // empty state on a failure would assert something we do not know.
    renderTab({ hasError: true });

    expect(screen.getByTestId("account-positions-error")).toBeInTheDocument();
    expect(screen.queryByText("No positions yet")).not.toBeInTheDocument();
  });

  it("shows the empty state once a request lands with nothing", () => {
    renderTab({ positions: noPositions });

    expect(screen.getByText("No positions yet")).toBeInTheDocument();
  });

  it("promises a dollar figure when the account holds depositable tokens", () => {
    renderTab({
      positions: noPositions,
      projectedUsd: "89.32",
      bestApy: 0.1694,
    });

    expect(
      screen.getByTestId("account-positions-projection"),
    ).toHaveTextContent("$89.32");
  });

  it("promises the ceiling rate when it holds none", () => {
    renderTab({ positions: noPositions, projectedUsd: null, bestApy: 0.1694 });

    expect(
      screen.getByTestId("account-positions-projection"),
    ).toHaveTextContent("16.94%");
  });

  it("omits the card entirely when neither figure is known", () => {
    renderTab({ positions: noPositions, projectedUsd: null, bestApy: null });

    expect(
      screen.queryByTestId("account-positions-projection"),
    ).not.toBeInTheDocument();
  });

  it("renders one row per supplied token", () => {
    renderTab({ positions: twoAssetPositions });

    expect(screen.getByTestId("position-row-USDC")).toBeInTheDocument();
    expect(screen.getByTestId("position-row-XLM")).toBeInTheDocument();
  });

  it("reports a row tap with the pool it belongs to", () => {
    // The sheet itself opens from AccountPositions' own state (see
    // AccountPositions.sheet.test.tsx); this only covers the analytics side of
    // the same tap.
    renderTab({ positions: twoAssetPositions });

    fireEvent.click(screen.getByTestId("position-row-USDC"));

    expect(trackPositionRowSelected).toHaveBeenCalledWith({
      poolId: POOL_ID,
      protocol: "blend",
      assetCode: "USDC",
    });
  });

  it("renders an unavailable value as -- rather than zero", () => {
    renderTab({ positions: unpricedPositions });

    expect(screen.getByTestId("position-value-USDC")).toHaveTextContent("--");
  });

  it("colors a real interest gain and shows the amount", () => {
    renderTab({ positions: positiveGainPositions });

    const gain = screen.getByTestId("position-gain-USDC");
    expect(gain).toHaveClass("PositionRow__gain--positive");
    expect(gain).toHaveTextContent("+$0.12");
  });

  it("shows a flat-zero interest gain without coloring it like a real gain", () => {
    renderTab({ positions: zeroGainPositions });

    const gain = screen.getByTestId("position-gain-USDC");
    expect(gain).not.toHaveClass("PositionRow__gain--positive");
    expect(gain).toHaveTextContent("+$0.00");
  });

  it("renders an unavailable interest gain as -- without coloring it", () => {
    renderTab({ positions: unavailableGainPositions });

    const gain = screen.getByTestId("position-gain-USDC");
    expect(gain).not.toHaveClass("PositionRow__gain--positive");
    expect(gain).toHaveTextContent("--");
  });

  it("routes the rate line through translation (not the bare fallback) when the rate is available", () => {
    renderTab({ positions: positiveGainPositions });

    // react-i18next's t() is mocked in this test env to echo its key
    // untouched (config/jest/setupTests.tsx) rather than interpolate --
    // formatRate's own tests cover the actual "16.94%" formatting. This just
    // proves the available-rate branch (through t()) is taken instead of the
    // bare "--" fallback.
    expect(screen.getByTestId("position-apy-USDC")).toHaveTextContent(
      "{{rate}} APY",
    );
  });

  it("renders the rate line as a bare -- when the rate is unavailable, not '-- APY'", () => {
    renderTab({ positions: unavailableRatePositions });

    const apy = screen.getByTestId("position-apy-USDC");
    expect(apy).toHaveTextContent("--");
    expect(apy).not.toHaveTextContent("APY");
  });
});
