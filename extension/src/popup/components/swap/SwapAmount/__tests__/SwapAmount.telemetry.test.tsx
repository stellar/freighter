import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import { emitMetric } from "helpers/metrics";
import { toast } from "sonner";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as XlmReserve from "popup/helpers/xlmReserve";

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

// The quote-expired notice is a sonner toast; assert it fires rather than
// rendering the portal (the test Wrapper doesn't mount a Toaster).
jest.mock("sonner", () => ({ toast: { custom: jest.fn() } }));

const emitMetricMock = emitMetric as jest.Mock;
const toastCustomMock = toast.custom as jest.Mock;

const nativeBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
  blockaidData: {},
};

const swapData = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "TESTNET" },
  icons: {},
  userBalances: { balances: [nativeBalance] },
  tokenPrices: {},
};

const renderSwapAmount = (
  transactionData: Record<string, unknown>,
  goToNext = jest.fn(),
) =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: "native",
              amount: "5",
              amountUsd: "0.00",
              destinationAmount: "10",
              allowedSlippage: "2",
              transactionFee: "",
              transactionTimeout: 180,
              memo: "",
              destination: "",
              path: [],
              destinationAsset:
                "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
              destinationTokenDetails: null,
              isToken: false,
              ...transactionData,
            },
          },
        } as any
      }
      routes={["/"]}
    >
      <SwapAmount
        inputType="crypto"
        setInputType={jest.fn()}
        goBack={jest.fn()}
        goToNext={goToNext}
        goToEditSrc={jest.fn()}
        goToEditDst={jest.fn()}
      />
    </Wrapper>,
  );

describe("SwapAmount telemetry + quote-expired surfacing", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest
      .spyOn(XlmReserve, "shouldShowXlmReservePreflight")
      .mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    emitMetricMock.mockClear();
    toastCustomMock.mockClear();
  });

  it("shows the quote-expired notice and emits swapQuoteExpired when flagged", async () => {
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.ERROR, data: null, error: "No path found" },
      isQuoteExpired: true,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

    renderSwapAmount({});

    await waitFor(() => {
      expect(toastCustomMock).toHaveBeenCalled();
    });

    const expiredCall = emitMetricMock.mock.calls.find(
      (c) => c[0] === "swap: quote expired",
    );
    expect(expiredCall).toBeDefined();
    expect(expiredCall![1]).toMatchObject({
      sourceToken: "native",
      destToken:
        "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
      sourceAmount: "5",
      destAmount: "10",
      allowedSlippage: "2",
    });
  });

  it("does NOT show the quote-expired notice when not flagged", async () => {
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: { transactionXdr: "AAAA", scanResult: null },
        error: null,
      },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

    renderSwapAmount({});

    await waitFor(() => {
      expect(
        screen.getByTestId("swap-amount-btn-continue"),
      ).toBeInTheDocument();
    });
    expect(toastCustomMock).not.toHaveBeenCalled();
    expect(
      emitMetricMock.mock.calls.find((c) => c[0] === "swap: quote expired"),
    ).toBeUndefined();
  });

  it("emits the percentage action event (not a screen view) when a percentage button is tapped (D5)", async () => {
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: { transactionXdr: "AAAA", scanResult: null },
        error: null,
      },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

    renderSwapAmount({});

    const pctButton = await screen.findByText("25%");
    await act(async () => {
      fireEvent.click(pctButton);
    });

    // Reclassified as an action event (RFC #2883, D5): a percentage/set-max tap
    // is a user action, so it must NOT re-emit the swap_amount screen.viewed and
    // inflate its count (which is what the pre-fix emitScreenViewed did).
    const pctCall = emitMetricMock.mock.calls.find(
      (c) => c[0] === "swap: amount percentage set",
    );
    expect(pctCall).toBeDefined();
    expect(pctCall![1]).toMatchObject({ percentage: 25 });

    // No screen.viewed emitted from the button tap.
    expect(
      emitMetricMock.mock.calls.find((c) => c[0] === "screen.viewed"),
    ).toBeUndefined();
  });

  it("does NOT emit swapTrustlineAdded at review time — it fires post-confirmation", async () => {
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: { transactionXdr: "AAAA", scanResult: null },
        error: null,
      },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

    const goToNext = jest.fn();
    renderSwapAmount(
      {
        destinationTokenDetails: {
          tokenCode: "AQUA",
          requiresTrustline: true,
          decimals: 7,
          issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
        },
      },
      goToNext,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("swap-amount-btn-continue"));
    });

    const confirmBtn = await screen.findByTestId("SubmitAction");
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // The trustline-added metric fires in useSubmitTxData after the swap
    // settles, not here at review/confirm time.
    expect(
      emitMetricMock.mock.calls.find((c) => c[0] === "swap: trustline added"),
    ).toBeUndefined();
    expect(goToNext).toHaveBeenCalled();
  });
});
