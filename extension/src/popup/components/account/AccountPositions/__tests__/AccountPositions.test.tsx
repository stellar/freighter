import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
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
const unpricedPositions = withSupply([supply({ usdValue: null })]);

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
        {...props}
      />
    </Wrapper>,
  );

describe("AccountPositions", () => {
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
    renderTab({
      positions: {
        address: TEST_PUBLIC_KEY,
        totalValueUsd: null,
        netApy: null,
        positions: [],
        backstop: [],
      },
    });

    expect(screen.getByText("No positions yet")).toBeInTheDocument();
  });

  it("renders one row per supplied token, each opening its pool", () => {
    const onSelectRow = jest.fn();
    renderTab({ positions: twoAssetPositions, onSelectRow });

    expect(screen.getByTestId("position-row-USDC")).toBeInTheDocument();
    expect(screen.getByTestId("position-row-XLM")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("position-row-USDC"));
    expect(onSelectRow).toHaveBeenCalledWith(
      expect.objectContaining({ code: "USDC", poolId: POOL_ID }),
    );
  });

  it("renders an unavailable value as -- rather than zero", () => {
    renderTab({ positions: unpricedPositions });

    expect(screen.getByTestId("position-value-USDC")).toHaveTextContent("--");
  });
});
