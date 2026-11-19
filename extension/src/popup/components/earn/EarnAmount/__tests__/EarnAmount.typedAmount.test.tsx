import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BigNumber from "bignumber.js";
import {
  Account,
  Operation,
  Transaction,
  TransactionBuilder,
  scValToNative,
} from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS, NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { getBlendSuppliedTokens } from "@shared/api/helpers/blend";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { simulateTransaction } from "@shared/api/internal";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import * as UseGetEarnAmountData from "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData";
import * as BlendDeposit from "popup/helpers/blendDeposit";
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

// The deposit is built and simulated for real; only the account load and the
// backend's simulation endpoint are stubbed.
jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  ...jest.requireActual("@shared/api/helpers/stellarSdkServer"),
  stellarSdkServer: jest.fn(),
}));

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  simulateTransaction: jest.fn(),
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
      <EarnAmount
        goBack={jest.fn()}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    </Wrapper>,
  );

/** The `amount` of the one request in the built `pool.submit` call. */
const builtRequestAmount = (txXdr: string) => {
  const tx = TransactionBuilder.fromXDR(
    txXdr,
    TESTNET_NETWORK_DETAILS.networkPassphrase,
  ) as Transaction;
  const { func } = tx.operations[0] as Operation.InvokeHostFunction;
  if (func.type !== "hostFunctionTypeInvokeContract") {
    throw new Error("Expected a contract call");
  }
  // submit(from, spender, to, requests)
  const [request] = scValToNative(func.invokeContract.args[3]);
  return String(request.amount);
};

describe("EarnAmount typed amount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    jest.spyOn(BlendDeposit, "buildAndSimulateBlendDeposit");
    (stellarSdkServer as jest.Mock).mockReturnValue({
      loadAccount: jest
        .fn()
        .mockResolvedValue(new Account(TEST_PUBLIC_KEY, "1")),
    });
    (simulateTransaction as jest.Mock).mockImplementation(
      async ({ xdr }: { xdr: string }) => ({
        ok: true,
        response: {
          preparedTransaction: xdr,
          simulationResponse: { minResourceFee: "10000" },
        },
      }),
    );
    (getBlendSuppliedTokens as jest.Mock).mockResolvedValue(RAW_POSITION);
  });
  afterEach(() => jest.restoreAllMocks());

  // A typed amount reaches redux with its thousands separators, as the input
  // shows it.
  it.each([
    {
      typed: "1000",
      shown: "1,000",
      reviewed: "1,000.00",
      stroops: "10000000000",
      usd: "$1,000.00",
      position: "100.00 → 1,100.00 USDC",
      monthly: "≈ $4.58",
      yearly: "≈ $55.00",
    },
    {
      typed: "1234.56",
      shown: "1,234.56",
      reviewed: "1,234.56",
      stroops: "12345600000",
      usd: "$1,234.56",
      position: "100.00 → 1,334.56 USDC",
      monthly: "≈ $5.56",
      yearly: "≈ $66.73",
    },
  ])(
    "deposits $shown typed into the input as that number",
    async ({
      typed,
      shown,
      reviewed,
      stroops,
      usd,
      position,
      monthly,
      yearly,
    }) => {
      renderAmount();

      const input = screen.getByTestId("send-amount-amount-input");
      fireEvent.change(input, { target: { value: typed } });
      expect(input).toHaveValue(shown);

      await act(async () => {
        fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
      });

      expect(
        screen.queryByTestId("earn-amount-fail-banner"),
      ).not.toBeInTheDocument();
      expect(BlendDeposit.buildAndSimulateBlendDeposit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: typed }),
      );
      const [{ xdr: builtXdr }] = (simulateTransaction as jest.Mock).mock
        .calls[0];
      expect(builtRequestAmount(builtXdr)).toBe(stroops);

      const review = screen.getByTestId("earn-review");
      await waitFor(() =>
        expect(review.closest(".SlideupModal")).toHaveClass("open"),
      );
      expect(review).not.toHaveTextContent("NaN");
      expect(screen.getByTestId("earn-review-amount")).toHaveTextContent(
        `${reviewed} USDC`,
      );
      expect(review).toHaveTextContent(usd);
      expect(screen.getByTestId("earn-review-position")).toHaveTextContent(
        position,
      );
      expect(screen.getByTestId("earn-review-monthly")).toHaveTextContent(
        monthly,
      );
      expect(screen.getByTestId("earn-review-yearly")).toHaveTextContent(
        yearly,
      );
      // The input still reads as typed.
      expect(input).toHaveValue(shown);
    },
  );

  it("says an amount over the balance is too much, as Swap does", () => {
    renderAmount();

    fireEvent.change(screen.getByTestId("send-amount-amount-input"), {
      target: { value: "6000" },
    });

    // On the card, naming the maximum (the tests' translator doesn't
    // interpolate), with the amount left in its usual color.
    expect(
      screen.getByText(
        "Insufficient balance. Maximum spendable: {{amount}} {{symbol}}",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("send-amount-amount-input").className,
    ).not.toContain("invalid");
    expect(screen.getByTestId("earn-amount-btn-continue")).toHaveTextContent(
      "Insufficient balance",
    );
    expect(screen.getByTestId("earn-amount-btn-continue")).toBeDisabled();
  });
});
