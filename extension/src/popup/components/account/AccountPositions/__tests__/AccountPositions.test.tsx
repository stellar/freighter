import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS, NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { AccountPositions } from "popup/components/account/AccountPositions";
import { TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";
import { Account, BASE_FEE, Networks, TransactionBuilder } from "stellar-sdk";
import {
  BlendRequestType,
  buildBlendRequestScVal,
  buildBlendSubmitOp,
} from "@shared/helpers/soroban/blend";

// The pool Earn deposits into, and another pool the account supplies to.
const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
const OTHER_POOL_ID =
  "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
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

const withSupply = (rows: unknown[], poolId = POOL_ID) =>
  ({
    address: TEST_PUBLIC_KEY,
    totalValueUsd: 620.16,
    netApy: 0.16,
    positions: [
      {
        protocol: "blend",
        id: poolId,
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

const defaultState = {
  settings: {
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: [MAINNET_NETWORK_DETAILS],
  },
};

const renderTab = (
  props: Partial<React.ComponentProps<typeof AccountPositions>> & {
    state?: Record<string, unknown>;
  },
) => {
  const { state, ...componentProps } = props;
  return render(
    <Wrapper state={{ ...defaultState, ...state }} routes={["/"]}>
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
        {...componentProps}
      />
    </Wrapper>,
  );
};

describe("AccountPositions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("spins while the request is in flight", () => {
    renderTab({ isLoading: true });

    expect(screen.getByTestId("account-positions-loader")).toBeInTheDocument();
    expect(
      screen.queryByTestId("account-positions-empty"),
    ).not.toBeInTheDocument();
  });

  it("shows an error rather than claiming the account has none", () => {
    // "Could not load" and "you have none" are different answers. Rendering the
    // empty state on a failure would assert something we do not know.
    renderTab({ hasError: true });

    expect(screen.getByTestId("account-positions-error")).toBeInTheDocument();
    expect(
      screen.queryByTestId("account-positions-empty"),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state once a request lands with nothing", () => {
    renderTab({ positions: noPositions });

    expect(screen.getByTestId("account-positions-empty")).toBeInTheDocument();
    expect(screen.getByText("Start earning")).toBeInTheDocument();
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

  it("hides Start Earning when the flag is off but keeps the projection", () => {
    renderTab({
      positions: noPositions,
      projectedUsd: "89.32",
      bestApy: 0.1694,
      state: { remoteConfig: { earn_deposit: false } },
    });

    expect(
      screen.queryByTestId("account-positions-start-earning"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("account-positions-projection"),
    ).toBeInTheDocument();
  });

  it("renders one card per pool, not per supplied token", () => {
    // twoAssetPositions holds ONE pool with TWO supplied assets. The old tab
    // showed two rows; the pool-shaped tab shows one card.
    //
    // PoolCard also carries `pool-card-value-*`, `pool-card-gain-*` and
    // `pool-card-apy-*` child testids, all of which start with "pool-card-"
    // too -- so the card root is matched by its id ending exactly at the pool
    // id, not merely starting with the shared prefix.
    renderTab({ positions: twoAssetPositions });

    expect(screen.getAllByTestId(/^pool-card-[A-Z0-9]+$/)).toHaveLength(1);
    expect(screen.queryByTestId("position-row-USDC")).not.toBeInTheDocument();
  });

  it("opens the pool's screen when a pool card is tapped", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));

    expect(
      await screen.findByTestId("pool-position-screen"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("position-row-USDC")).toBeInTheDocument();
  });

  it("closes the pool's screen from its back arrow without leaving the tab", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    await screen.findByTestId("pool-position-screen");
    fireEvent.click(screen.getByTestId("BackButton"));

    await waitFor(() =>
      expect(
        screen.queryByTestId("pool-position-screen"),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId(`pool-card-${POOL_ID}`)).toBeInTheDocument();
  });

  it("opens a supplied token's screen over the pool's, on Your position", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    fireEvent.click(await screen.findByTestId("position-row-USDC"));

    expect(
      await screen.findByTestId("token-position-screen"),
    ).toBeInTheDocument();
    // The pool's screen is "Position details"; a token's is named for it
    // ("USDC position"). The i18n mock returns keys uninterpolated.
    expect(screen.getByText("{{tokenCode}} position")).toBeInTheDocument();
    // Principal and interest: 500.12 = 500.00 deposited + 0.12 earned.
    expect(
      screen.getByTestId("earn-position-deposit-usd-USDC"),
    ).toHaveTextContent("$500.00");
    expect(
      screen.getByTestId("earn-position-earnings-usd-USDC"),
    ).toHaveTextContent("+$0.12");
    expect(screen.getByTestId("position-tab-your_position")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  // A position that lost value reads as a loss, in grey, on every figure.
  it("greys a token's loss and signs its earnings negative", async () => {
    renderTab({
      positions: withSupply([
        supply({ interestEarned: "-97881", interestEarnedUsd: -1.5 }),
      ]),
      pools: [pool],
    });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    expect(await screen.findByTestId("pool-position-gain")).toHaveClass(
      "PositionScreen__gain--loss",
    );
    fireEvent.click(await screen.findByTestId("position-row-USDC"));

    const gain = await screen.findByTestId("token-position-gain");
    expect(gain).toHaveTextContent(/^-\$1\.50/);
    expect(gain).toHaveClass("PositionScreen__gain--loss");
    const earnings = screen.getByTestId("earn-position-earnings-usd-USDC");
    expect(earnings).toHaveTextContent("-$1.50");
    expect(earnings).not.toHaveTextContent("+");
    expect(earnings).toHaveClass("PositionScreen__positive--loss");
  });

  it("switches to Overview, with the pool's links", async () => {
    renderTab({ positions: twoAssetPositions, pools: [pool] });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    fireEvent.click(await screen.findByTestId("position-row-USDC"));
    fireEvent.click(await screen.findByTestId("position-tab-overview"));

    expect(screen.getByTestId("token-position-overview")).toBeInTheDocument();
    expect(screen.getByTestId("token-position-blend-link")).toBeInTheDocument();
    expect(
      screen.getByTestId("token-position-explorer-link"),
    ).toBeInTheDocument();
  });

  describe("depositing", () => {
    const flagOn = {
      remoteConfig: { earn_deposit: true, isInitialized: true },
    };

    it("deposits into the token's own pool from its screen", async () => {
      const onDeposit = jest.fn();
      renderTab({
        positions: twoAssetPositions,
        pools: [pool],
        onDeposit,
        state: flagOn,
      });

      fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
      fireEvent.click(await screen.findByTestId("position-row-USDC"));
      fireEvent.click(await screen.findByTestId("token-position-deposit"));

      expect(onDeposit).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: USDC_SAC, poolId: POOL_ID }),
        pool,
      );
    });

    it("offers no Deposit on a token in a pool Earn doesn't offer", async () => {
      // Earn deposits only into its own vetted pool; the picker lists no
      // other, so this entry must not open one either.
      renderTab({
        positions: withSupply([supply()], OTHER_POOL_ID),
        pools: [{ ...pool, id: OTHER_POOL_ID }],
        state: flagOn,
      });

      fireEvent.click(screen.getByTestId(`pool-card-${OTHER_POOL_ID}`));
      fireEvent.click(await screen.findByTestId("position-row-USDC"));
      await screen.findByTestId("token-position-screen");
      expect(
        screen.queryByTestId("token-position-deposit"),
      ).not.toBeInTheDocument();
    });

    it("keeps Deposit in view but disabled, under a banner, while the pool is paused", async () => {
      renderTab({
        positions: twoAssetPositions,
        pools: [{ ...pool, status: "FROZEN" }],
        state: flagOn,
      });

      fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
      fireEvent.click(await screen.findByTestId("position-row-USDC"));

      expect(
        await screen.findByTestId("earn-pool-paused-banner"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("token-position-deposit")).toBeDisabled();
    });

    it("says nothing about pausing on a pool Earn doesn't offer", async () => {
      renderTab({
        positions: withSupply([supply()], OTHER_POOL_ID),
        pools: [{ ...pool, id: OTHER_POOL_ID, status: "FROZEN" }],
        state: flagOn,
      });

      fireEvent.click(screen.getByTestId(`pool-card-${OTHER_POOL_ID}`));
      fireEvent.click(await screen.findByTestId("position-row-USDC"));
      await screen.findByTestId("token-position-screen");

      expect(
        screen.queryByTestId("earn-pool-paused-banner"),
      ).not.toBeInTheDocument();
    });

    it("ends the list with a Deposit button into Earn", () => {
      renderTab({ positions: twoAssetPositions, pools: [pool], state: flagOn });

      expect(screen.getByTestId("positions-deposit-btn")).toHaveAttribute(
        "href",
        expect.stringContaining("source=positions_pill"),
      );
    });

    it("offers neither Deposit with the flag off", async () => {
      renderTab({ positions: twoAssetPositions, pools: [pool] });

      expect(
        screen.queryByTestId("positions-deposit-btn"),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
      fireEvent.click(await screen.findByTestId("position-row-USDC"));
      await screen.findByTestId("token-position-screen");
      expect(
        screen.queryByTestId("token-position-deposit"),
      ).not.toBeInTheDocument();
    });
  });

  it("lists the token's deposits from the history Home already loaded", async () => {
    const operation = {
      id: "9",
      type: "invoke_host_function",
      transaction_successful: true,
      created_at: "2026-08-28T12:00:00Z",
      transaction_hash: "hash-9",
      transaction_attr: {
        envelope_xdr: depositEnvelope(USDC_SAC, "5000000000"),
      },
      asset_balance_changes: [],
    };
    renderTab({
      positions: twoAssetPositions,
      pools: [pool],
      state: {
        auth: { publicKey: TEST_PUBLIC_KEY },
        cache: {
          historyData: { PUBLIC: { [TEST_PUBLIC_KEY]: [operation] } },
        },
      },
    });

    fireEvent.click(screen.getByTestId(`pool-card-${POOL_ID}`));
    fireEvent.click(await screen.findByTestId("position-row-USDC"));

    const rows = await screen.findAllByTestId("position-activity-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("+500.00 USDC");
  });
});

/** A deposit envelope for `submit` on POOL_ID, as History joins it. */
function depositEnvelope(assetId: string, amount: string) {
  return new TransactionBuilder(new Account(TEST_PUBLIC_KEY, "1"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(
      buildBlendSubmitOp({
        poolId: POOL_ID,
        publicKey: TEST_PUBLIC_KEY,
        requests: [
          buildBlendRequestScVal({
            assetId,
            amount,
            requestType: BlendRequestType.SupplyCollateral,
            networkPassphrase: Networks.PUBLIC,
          }),
        ],
        networkPassphrase: Networks.PUBLIC,
      }),
    )
    .setTimeout(30)
    .build()
    .toXDR();
}
