import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";
import { Account } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS, NETWORKS } from "@shared/constants/stellar";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { getBlendSuppliedTokens } from "@shared/api/helpers/blend";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { simulateTransaction } from "@shared/api/internal";
import { captureException } from "@sentry/browser";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { EarnAmount } from "popup/components/earn/EarnAmount";
import * as UseGetEarnAmountData from "popup/components/earn/EarnAmount/hooks/useGetEarnAmountData";
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

jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  ...jest.requireActual("@shared/api/helpers/stellarSdkServer"),
  stellarSdkServer: jest.fn(),
}));

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  simulateTransaction: jest.fn(),
}));

jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
const USDC_SAC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const INCLUSION_FEE = "0.00001";

const mockAmountData = (xlmTotal: string) => {
  const data = {
    type: AppDataType.RESOLVED,
    publicKey: TEST_PUBLIC_KEY,
    networkDetails: TESTNET_NETWORK_DETAILS,
    balances: {
      balances: [
        {
          token: { type: "native", code: "XLM" },
          total: new BigNumber(xlmTotal),
          available: new BigNumber(xlmTotal),
          // A 1 XLM reserve, so what's spendable is what sits above it.
          minimumBalance: new BigNumber("1"),
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
  jest.spyOn(UseGetEarnAmountData, "useGetEarnAmountData").mockReturnValue({
    state: { state: RequestState.SUCCESS, data, error: null },
    fetchData: jest.fn().mockResolvedValue(data),
  } as any);
};

/** Asks to review a 100 USDC deposit. */
const continueWithUsdc = async () => {
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
  fireEvent.change(screen.getByTestId("send-amount-amount-input"), {
    target: { value: "100" },
  });
  await act(async () => {
    fireEvent.click(screen.getByTestId("earn-amount-btn-continue"));
  });
};

/** The pool, as the backend reports it, rejects the simulation. */
const rejectSimulation = (reason: string) =>
  (simulateTransaction as jest.Mock).mockResolvedValue({
    ok: false,
    response: `Error: Error - simulation incorrect: ${JSON.stringify({
      error: `${reason}\n\nEvent log (newest first): …`,
    })}\n    at simulateTx (soroban.ts:1:1)`,
  });

// A rejected simulation says why in plain words, as on mobile; the pool's own
// error goes to Sentry.
describe("EarnAmount's simulation errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: INCLUSION_FEE,
    } as any);
    (stellarSdkServer as jest.Mock).mockReturnValue({
      loadAccount: jest
        .fn()
        .mockResolvedValue(new Account(TEST_PUBLIC_KEY, "1")),
    });
    (getBlendSuppliedTokens as jest.Mock).mockResolvedValue("0");
    mockAmountData("100");
  });
  afterEach(() => jest.restoreAllMocks());

  it("says the pool can't take the deposit, and reports the pool's error", async () => {
    rejectSimulation("HostError: Error(Contract, #1206)");

    await continueWithUsdc();

    expect(
      await screen.findByText(
        "The pool can’t take this deposit right now. Try again later.",
      ),
    ).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledWith(
      "Failed to simulate an Earn deposit - HostError: Error(Contract, #1206)",
    );
  });

  it("says when there isn't enough of the token", async () => {
    rejectSimulation("HostError: Error(Contract, #10)");

    await continueWithUsdc();

    // The tests' translator doesn't interpolate, so the token code shows as
    // its placeholder.
    expect(
      await screen.findByText(
        "Not enough {{code}} for this deposit. Try a smaller amount.",
      ),
    ).toBeInTheDocument();
  });
});
