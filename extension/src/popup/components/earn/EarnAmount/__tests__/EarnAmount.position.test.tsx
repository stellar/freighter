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

const renderAmount = () =>
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
            // Left null so the pool card and its details sheet stay out of the
            // way; the review sheet falls back to "Blend pool".
            pool: null,
            selectedAssetId: USDC_SAC,
            selectedAssetApy: 0.05,
            currentPositionTokens: "0",
          },
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

    renderAmount();

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

    renderAmount();

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
});
