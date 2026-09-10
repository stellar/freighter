import React from "react";
import { render, waitFor, act } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import { Swap } from "popup/views/Swap";
import { emitScreenViewed } from "helpers/metrics";
import { submitFreighterTransaction } from "popup/ducks/transactionSubmission";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as XlmReserve from "popup/helpers/xlmReserve";
import * as UseSwapFromData from "popup/components/swap/SwapAsset/hooks/useSwapFromData";
import * as UseSwapTokenLookup from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";

// Stub the emit so the assertions do not depend on buildCommonContext, which
// reads Redux slices this suite's minimal store does not provide. Mirrors the
// Send and Swap.selectionType suites.
jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));

const emitScreenViewedMock = emitScreenViewed as jest.Mock;

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

const resolvedFromState = {
  state: RequestState.SUCCESS,
  data: {
    type: AppDataType.RESOLVED,
    publicKey: "G123",
    balances: { balances: [], icons: {} },
    filteredBalances: [],
    networkDetails: { network: "PUBLIC", networkUrl: "" },
    applicationState: "MNEMONIC_PHRASE_CONFIRMED",
    tokenPrices: {},
  },
  error: null,
};

const emptyLookupResult = {
  sections: { yourTokens: [], popular: [], verified: [], unverified: [] },
  isSearch: false,
  hadSorobanMatches: false,
  isFallback: false,
};

const renderSwap = () =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            transactionData: {
              asset: "native",
              amount: "5",
              amountUsd: "0.00",
              destinationAmount: "",
              allowedSlippage: "2",
              transactionFee: "",
              transactionTimeout: 180,
              memo: "",
              destination: "",
              path: [],
              destinationAsset: "",
              destinationTokenDetails: null,
              isToken: false,
            },
          },
        } as any
      }
      routes={["/swap"]}
    >
      <Swap />
    </Wrapper>,
  );

/** Drives a real submission-status transition through the root reducer. */
const dispatchStatus = (type: string, payload?: unknown) =>
  act(() => {
    getTestStore()!.dispatch({ type, payload } as never);
  });

const callsFor = (screenName: string) =>
  emitScreenViewedMock.mock.calls.filter((c) => c[0] === screenName);

describe("Swap flow stage telemetry", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: { transactionXdr: "AAAA", scanResult: null },
        error: null,
      },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest
      .spyOn(XlmReserve, "shouldShowXlmReservePreflight")
      .mockReturnValue(false);
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: resolvedFromState,
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);
    jest.spyOn(UseSwapTokenLookup, "useSwapTokenLookup").mockReturnValue({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: RequestState.SUCCESS,
        data: emptyLookupResult,
        error: null,
      },
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    emitScreenViewedMock.mockClear();
  });

  it("emits swap_processing once while a submission is in flight", async () => {
    // The swap flow had no processing stage at all, so a swap could not be
    // followed past the review screen.
    renderSwap();
    await waitFor(() => expect(emitScreenViewedMock).toHaveBeenCalled());

    dispatchStatus(submitFreighterTransaction.pending.type);

    await waitFor(() => {
      expect(emitScreenViewedMock).toHaveBeenCalledWith("swap_processing", {
        flow: "swap",
        step: "processing",
      });
    });
    expect(callsFor("swap_processing")).toHaveLength(1);
  });

  it("emits swap_success once when a submission succeeds", async () => {
    renderSwap();
    await waitFor(() => expect(emitScreenViewedMock).toHaveBeenCalled());

    dispatchStatus(submitFreighterTransaction.pending.type);
    dispatchStatus(submitFreighterTransaction.fulfilled.type);

    await waitFor(() => {
      expect(emitScreenViewedMock).toHaveBeenCalledWith("swap_success", {
        flow: "swap",
        step: "success",
      });
    });
    expect(callsFor("swap_success")).toHaveLength(1);
  });

  it("emits swap_processing again when the user retries after a failure", async () => {
    // The guards reset on ERROR as well as IDLE. A retry goes ERROR ->
    // PENDING without passing through IDLE, so guarding on IDLE alone would
    // drop the retried attempt.
    renderSwap();
    await waitFor(() => expect(emitScreenViewedMock).toHaveBeenCalled());

    dispatchStatus(submitFreighterTransaction.pending.type);
    dispatchStatus(submitFreighterTransaction.rejected.type, {
      errorMessage: "op_underfunded",
    });
    dispatchStatus(submitFreighterTransaction.pending.type);

    await waitFor(() => {
      expect(callsFor("swap_processing")).toHaveLength(2);
    });
  });

  it("does not emit the submitting screen as the confirm stage", async () => {
    // `confirm` belongs to the review modal, which the user sees before
    // deciding. The submitting screen is reached only after approval.
    renderSwap();
    await waitFor(() => expect(emitScreenViewedMock).toHaveBeenCalled());

    dispatchStatus(submitFreighterTransaction.pending.type);

    await waitFor(() => {
      expect(callsFor("swap_processing")).toHaveLength(1);
    });
    expect(callsFor("swap_confirm")).toHaveLength(0);
  });
});
