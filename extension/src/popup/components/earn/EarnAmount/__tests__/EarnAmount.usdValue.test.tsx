import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import BigNumber from "bignumber.js";

import { TESTNET_NETWORK_DETAILS, NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
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

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

// 100 USDC at 7 decimals — the raw shape `/accounts/positions` returns.
const RAW_POSITION = "1000000000";

const earnAmountData = {
  type: AppDataType.RESOLVED,
  publicKey: TEST_PUBLIC_KEY,
  networkDetails: TESTNET_NETWORK_DETAILS,
  balances: {
    balances: [
      {
        token: { type: "native", code: "XLM" },
        total: new BigNumber("100"),
        available: new BigNumber("100"),
        blockaidData: {},
      },
      {
        token: { code: "USDC", issuer: { key: USDC_ISSUER } },
        total: new BigNumber("5000"),
        available: new BigNumber("5000"),
        blockaidData: {},
      },
    ],
    icons: {},
  },
  tokenPrices: { [TEST_USDC_CANONICAL]: { currentPrice: "1" } },
};

const renderAmount = (amount: string) =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: TEST_USDC_CANONICAL,
              amount,
              destination: POOL_ID,
              isToken: true,
            },
          },
          earn: {
            ...earnInitialState,
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

describe("EarnAmount deposit USD value", () => {
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
        simulate: jest.fn().mockResolvedValue({
          transactionXdr: "AAAA",
          scanResult: null,
          inclusionFee: "0.00001",
          resourceFee: "0.001",
        }),
      } as any);
    (getBlendSuppliedTokens as jest.Mock).mockResolvedValue(RAW_POSITION);
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows a deposit worth $1,000 or more and its projections on the review", async () => {
    const { container } = renderAmount("1234.56");

    expect(
      container.querySelector(".AmountCard__amount-price"),
    ).toHaveTextContent("$1,234.56");

    await act(async () => {
      fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
    });

    const review = screen.getByTestId("earn-review");
    await waitFor(() =>
      expect(review.closest(".SlideupModal")).toHaveClass("open"),
    );

    // A thousands separator in the USD value made it NaN for the review's own
    // formatting and for the position + deposit sum the projections start from.
    expect(review).not.toHaveTextContent("NaN");
    expect(within(review).getByText("$1,234.56")).toBeInTheDocument();
    // $100 already supplied, $1,334.56 after the deposit, both at 5%.
    expect(screen.getByTestId("earn-review-monthly")).toHaveTextContent(
      "$0.42 → $5.56",
    );
    expect(screen.getByTestId("earn-review-yearly")).toHaveTextContent(
      "$5.00 → $66.73",
    );
  });
});
