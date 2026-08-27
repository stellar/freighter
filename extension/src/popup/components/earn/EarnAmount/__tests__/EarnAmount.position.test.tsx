import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BigNumber from "bignumber.js";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getBlendSuppliedTokens } from "@shared/api/helpers/blend";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import * as UseGetEarnAmountData from "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData";
import * as UseSimulateEarnDeposit from "popup/components/earn/EarnAmount/hooks/useSimulateEarnDeposit";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import { initialState as earnInitialState } from "popup/ducks/earn";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import {
  TEST_PUBLIC_KEY,
  TEST_USDC_CANONICAL,
  Wrapper,
} from "popup/__testHelpers__";

jest.mock("@shared/api/helpers/blend", () => ({
  getBlendSuppliedTokens: jest.fn(),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

// 100 USDC at 7 decimals — the raw shape `/accounts/positions` returns.
const RAW_POSITION = "1000000000";

const nativeBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
  blockaidData: {},
};

const usdcBalance = {
  token: { code: "USDC", issuer: { key: USDC_ISSUER } },
  total: new BigNumber("500"),
  available: new BigNumber("500"),
  blockaidData: {},
};

const earnAmountData = {
  type: AppDataType.RESOLVED,
  publicKey: TEST_PUBLIC_KEY,
  networkDetails: TESTNET_NETWORK_DETAILS,
  balances: { balances: [nativeBalance, usdcBalance], icons: {} },
  tokenPrices: { [TEST_USDC_CANONICAL]: { currentPrice: "1" } },
};

// The deposit's destination pool — real enough to render the pool card and
// the details sheet it opens.
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
} as never;

const usdcSupply = {
  assetId: USDC_SAC,
  symbol: "USDC",
  name: `USDC:${USDC_ISSUER}`,
  decimals: 7,
  suppliedTokens: "0",
  collateralTokens: RAW_POSITION,
  totalTokens: RAW_POSITION,
  usdValue: 100,
  apy: 0.1694,
  emissionsApr: 0,
  interestEarned: "0",
  interestEarnedUsd: 0,
  claimableBlnd: "0",
  claimableUsd: null,
  priceUsd: 1,
};

// The cached shape `positionsSelector` returns for an account that already
// supplies `pool` — keyed into the store under `cache.positionsData` by the
// new tests below.
const existingPosition = {
  address: TEST_PUBLIC_KEY,
  totalValueUsd: 100,
  netApy: 0.1694,
  positions: [
    {
      protocol: "blend",
      id: POOL_ID,
      name: "Fixed Pool v2",
      netUsd: 100,
      suppliedUsd: 100,
      borrowedUsd: 0,
      netApy: 0.1694,
      blend: { supply: [usdcSupply], borrow: [] },
    },
  ],
  backstop: [],
  updatedAt: Date.now(),
} as never;

/**
 * A promise the test settles by hand. This is what makes the race deterministic:
 * the position lookup always loses to the simulation, which is the ordering the
 * production code cannot control.
 */
const makeDeferred = () => {
  let resolve!: (value: string) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// `overrides.cache` seeds `state.cache` — used by the position-tab tests
// below to control what `positionsSelector` reads without a network request.
const renderEarnAmount = (overrides: { cache?: any } = {}) =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: TEST_USDC_CANONICAL,
              amount: "5",
              destination: POOL_ID,
              isToken: true,
            },
          },
          earn: {
            ...earnInitialState,
            pool,
            selectedAssetId: USDC_SAC,
            selectedAssetApy: 0.05,
            currentPositionTokens: "0",
          },
          cache: overrides.cache,
        } as any
      }
      routes={["/"]}
    >
      <EarnAmount goBack={jest.fn()} onConfirm={jest.fn()} />
    </Wrapper>,
  );

/** The sheet is always mounted; `open`/`closed` is what actually shows it. */
const reviewSheet = () =>
  screen.getByTestId("earn-review").closest(".SlideupModal");

describe("EarnAmount position lookup", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetEarnAmountData, "useGetEarnAmountData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: earnAmountData,
        error: null,
      },
      fetchData: jest.fn().mockResolvedValue(earnAmountData),
    } as any);
    jest
      .spyOn(UseSimulateEarnDeposit, "useSimulateEarnDeposit")
      .mockReturnValue({
        state: {
          state: RequestState.SUCCESS,
          data: { transactionXdr: "AAAA", scanResult: null },
          error: null,
        },
        // Resolves immediately, so the position lookup is always the slower leg.
        simulate: jest.fn().mockResolvedValue({
          transactionXdr: "AAAA",
          scanResult: null,
          inclusionFee: "0.00001",
          resourceFee: "0.001",
        }),
      } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("holds the review sheet closed until the position resolves, then opens with the settled before-value", async () => {
    const position = makeDeferred();
    (getBlendSuppliedTokens as jest.Mock).mockReturnValue(position.promise);

    renderEarnAmount();

    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
    });

    // Simulation has already resolved here. Opening now would show "0 → 5" and
    // then flip all three derived rows under the user.
    expect(reviewSheet()).toHaveClass("closed");
    expect(screen.getByTestId("earn-review-position")).toHaveTextContent(
      "0 → 5 USDC",
    );

    await act(async () => {
      position.resolve(RAW_POSITION);
    });

    await waitFor(() => expect(reviewSheet()).toHaveClass("open"));
    expect(screen.getByTestId("earn-review-position")).toHaveTextContent(
      "100 → 105 USDC",
    );
  });

  it("still opens review when the position lookup fails, falling back to zero", async () => {
    (getBlendSuppliedTokens as jest.Mock).mockRejectedValue(
      new Error("positions 500"),
    );

    renderEarnAmount();

    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
    });

    await waitFor(() => expect(reviewSheet()).toHaveClass("open"));
    expect(screen.getByTestId("earn-review-position")).toHaveTextContent(
      "0 → 5 USDC",
    );
    // A failed before-value is not a failed deposit.
    expect(
      screen.queryByTestId("earn-amount-fail-banner"),
    ).not.toBeInTheDocument();
  });

  it("shows the Your position tab when the account already supplies this pool", async () => {
    // The requirement is that the tab appears wherever the sheet appears, not
    // only on the Positions tab — a repeat depositor should see their stake.
    renderEarnAmount({
      cache: {
        positionsData: { TESTNET: { [TEST_PUBLIC_KEY]: existingPosition } },
      },
    });

    fireEvent.click(screen.getByTestId("earn-pool-card"));

    expect(
      await screen.findByTestId("earn-pool-details-tabs"),
    ).toBeInTheDocument();
    // Opened on Overview: the user tapped the POOL card, so pool info is what
    // they asked for.
    expect(screen.getByTestId("earn-pool-interest-apy")).toBeInTheDocument();
  });

  it("stays untabbed with a Close button for a first-time depositor", async () => {
    renderEarnAmount({ cache: { positionsData: {} } });

    fireEvent.click(screen.getByTestId("earn-pool-card"));

    expect(
      await screen.findByTestId("earn-pool-details-sheet"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("earn-pool-details-tabs"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });
});
