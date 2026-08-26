import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { BlendCatalogPool } from "@shared/api/types/blend";

import { AccountPositions } from "popup/components/account/AccountPositions";
import { TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";

const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
const POOL_ID_2 = "CBKJ2R5UM6VXAYXHQPUW3ZO5RRP5FS3XPBOZFQ2Q4WFXA3Y3XZATV3XM";
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

const onePosition = withSupply([supply()]);
const twoAssetPositions = withSupply([
  supply({
    assetId: XLM_SAC,
    symbol: null,
    name: null,
    usdValue: 120.04,
  }),
  supply(),
]);

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

const pool2 = { ...pool, id: POOL_ID_2, name: "Variable Pool" };

// Two independent pool positions -- for the stale-modal regression below,
// which needs a second pool to switch to after closing the first.
const twoPoolPositions = {
  address: TEST_PUBLIC_KEY,
  totalValueUsd: 1120.28,
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
      blend: { supply: [supply()], borrow: [] },
    },
    {
      protocol: "blend",
      id: POOL_ID_2,
      name: "Variable Pool",
      netUsd: 500.12,
      suppliedUsd: 500.12,
      borrowedUsd: 0,
      netApy: 0.1,
      blend: { supply: [supply()], borrow: [] },
    },
  ],
  backstop: [],
} as never;

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

/**
 * Covers the tab's route into My position through a tapped pool card.
 *
 * Before this task, this file exercised the tab->PoolDetailsSheet path
 * directly (its own tabs, its Deposit button, the metrics that path fired).
 * That content now lives one level down, inside My position, and My position
 * only ships its shell in this task -- PoolDetailsSheet is nested inside it,
 * and the deposit funnel re-pointed at the asset rows, starting in Task 4.
 * Those assertions move there; what is left here is the part Task 3 actually
 * owns: My position opens for the tapped pool, whether or not the catalog
 * carries a matching entry for it.
 */
describe("AccountPositions pool sheet", () => {
  it("opens My position when a pool card is tapped, with a matching catalog pool", async () => {
    renderTab({ positions: onePosition, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));

    expect(await screen.findByTestId("my-position-sheet")).toBeInTheDocument();
  });

  it("still opens My position when the catalog has no matching pool", async () => {
    // `pool` on MyPositionProps is `BlendCatalogPool | null` for exactly this
    // reason: the position itself comes from `positions`, independent of
    // whether the (separately fetched) catalog has caught up with it yet.
    renderTab({ positions: onePosition, pools: [] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));

    expect(await screen.findByTestId("my-position-sheet")).toBeInTheDocument();
  });

  it("About pool opens the sheet with no tabs", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    fireEvent.click(await screen.findByTestId("my-position-about-pool"));

    expect(
      await screen.findByTestId("earn-pool-details-sheet"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("earn-pool-details-tabs"),
    ).not.toBeInTheDocument();
  });

  it("a supplied asset opens the sheet on Your position", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    fireEvent.click(await screen.findByTestId("position-row-USDC"));

    expect(
      await screen.findByTestId("earn-position-panel"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("earn-pool-details-tabs")).toBeInTheDocument();
  });

  it("does not carry a stale pool-details view into the next pool's My position", async () => {
    // Open pool A's My position, open About pool inside it, then close My
    // position without closing the nested sheet first. If closing My
    // position didn't also clear that nested state, it would reappear the
    // moment ANY pool card is tapped next -- including pool B's, over a
    // position it was never about.
    renderTab({ positions: twoPoolPositions, pools: [pool, pool2] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    fireEvent.click(await screen.findByTestId("my-position-about-pool"));
    expect(
      await screen.findByTestId("earn-pool-details-sheet"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("my-position-close"));
    expect(screen.queryByTestId("my-position-sheet")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID_2}`));
    expect(await screen.findByTestId("my-position-sheet")).toBeInTheDocument();
    expect(
      screen.queryByTestId("earn-pool-details-sheet"),
    ).not.toBeInTheDocument();
  });
});
