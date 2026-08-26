import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { AccountPositions } from "popup/components/account/AccountPositions";
import { TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";

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

const noPositions = {
  address: TEST_PUBLIC_KEY,
  totalValueUsd: null,
  netApy: null,
  positions: [],
  backstop: [],
} as never;

const pool = {
  id: POOL_ID,
  name: "Fixed Pool v2",
  status: "ACTIVE",
  suppliedUsd: 50050000,
  borrowedUsd: 16150000,
  interestApy: 0.0424,
  netApy: 0.1694,
  backstopUsd: 1530000,
  reserves: [],
} as never as BlendCatalogPool;

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

  it("renders one card per pool, not per supplied token", () => {
    // twoAssetPositions holds ONE pool with TWO supplied assets. The old tab
    // showed two rows; the pool-shaped tab shows one card.
    //
    // PoolCard (Task 2) also carries `pool-card-value-*`, `pool-card-gain-*`
    // and `pool-card-apy-*` child testids, all of which start with
    // "pool-card-" too -- so the card root is matched by its id ending
    // exactly at the pool id, not merely starting with the shared prefix.
    renderTab({ positions: twoAssetPositions });

    expect(screen.getAllByTestId(/^pool-card-[A-Z0-9]+$/)).toHaveLength(1);
    expect(screen.queryByTestId("position-row-USDC")).not.toBeInTheDocument();
  });

  it("opens My position when a pool card is tapped", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));

    expect(await screen.findByTestId("my-position-sheet")).toBeInTheDocument();
  });

  it("closes My position from its X without leaving the tab", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    fireEvent.click(await screen.findByTestId("my-position-close"));

    await waitFor(() =>
      expect(screen.queryByTestId("my-position-sheet")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId(`pool-card-${POOL_ID}`)).toBeInTheDocument();
  });
});
