import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

import { AccountPositions } from "popup/components/account/AccountPositions";
import { PositionTokenRow } from "popup/components/earn/helpers/positionRows";
import { TEST_PUBLIC_KEY, Wrapper, getTestStore } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { EARN_PREFILL_QUERY } from "popup/constants/earn";
import { navigateTo } from "popup/helpers/navigate";
import {
  resetSubmission,
  saveAsset,
  saveDestination,
  saveIsToken,
} from "popup/ducks/transactionSubmission";
import {
  saveEarnPool,
  saveSelectedAssetApy,
  saveSelectedAssetId,
} from "popup/ducks/earn";

const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const XLM_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

const mockNavigate = jest.fn();

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

/**
 * Mirrors `views/Account`'s `onDepositFromPosition` exactly — the same six
 * dispatches plus the prefilled navigate — run here against the store
 * `Wrapper` stashes (see `getTestStore`) rather than by importing the view,
 * since that handler is a local function there, not an exported unit.
 */
const onDeposit = (row: PositionTokenRow, depositPool: BlendCatalogPool) => {
  const store = getTestStore()!;
  store.dispatch(resetSubmission());
  store.dispatch(saveEarnPool(depositPool));
  store.dispatch(saveSelectedAssetApy(row.apy));
  store.dispatch(saveSelectedAssetId(row.assetId));
  store.dispatch(saveAsset(getCanonicalFromAsset(row.code, row.issuer)));
  store.dispatch(saveDestination(row.poolId));
  store.dispatch(saveIsToken(true));
  navigateTo(ROUTES.earn, mockNavigate, EARN_PREFILL_QUERY);
};

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
        onSelectRow={() => {}}
        projectedUsd={null}
        bestApy={null}
        onStartEarning={() => {}}
        pools={[]}
        onDeposit={onDeposit}
        {...props}
      />
    </Wrapper>,
  );

describe("AccountPositions pool sheet", () => {
  it("opens the pool sheet on Your position when a row is tapped", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId("position-row-USDC"));

    expect(
      await screen.findByTestId("earn-pool-details-sheet"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("earn-position-panel")).toBeInTheDocument();
    expect(screen.getByTestId("earn-position-balance")).toHaveTextContent(
      "$500.12",
    );
  });

  it("prefills the deposit and lands on the amount screen", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId("position-row-USDC"));
    fireEvent.click(await screen.findByText("Deposit"));

    // `Wrapper` stashes its store; getTestStore() is how the other suites read it.
    const state = getTestStore()!.getState();
    expect(state.earn.selectedAssetId).toBe(USDC_SAC);
    // `pool` is typed `BlendCatalogPool | null`; optional-chained rather than
    // asserted so a regression fails on a clear mismatch, not a thrown TypeError.
    expect(state.earn.pool?.id).toBe(POOL_ID);
    expect(state.transactionSubmission.transactionData.destination).toBe(
      POOL_ID,
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/earn?prefill=1"),
    );
  });
});
