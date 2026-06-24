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
import { Swap } from "popup/views/Swap";
import { emitMetric } from "helpers/metrics";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as XlmReserve from "popup/helpers/xlmReserve";
import * as UseSwapFromData from "popup/components/swap/SwapAsset/hooks/useSwapFromData";
import * as UseSwapTokenLookup from "popup/components/swap/SwapAsset/hooks/useSwapTokenLookup";

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

const emitMetricMock = emitMetric as jest.Mock;

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

const renderSwap = (transactionData: Record<string, unknown> = {}) =>
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
              ...transactionData,
            },
          },
        } as any
      }
      routes={["/swap"]}
    >
      <Swap />
    </Wrapper>,
  );

describe("Swap selectionType wiring", () => {
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
    emitMetricMock.mockClear();
  });

  it("opens the source picker (Swap from) with selectionType=source", async () => {
    renderSwap();

    // The sell card lives in the first swap card; its asset selector opens
    // the SET_FROM_ASSET step.
    const selectors = await screen.findAllByTestId(
      "send-amount-edit-dest-asset",
    );
    await act(async () => {
      fireEvent.click(selectors[0]);
    });

    await waitFor(() => {
      expect(screen.getByText("Swap from")).toBeInTheDocument();
    });
    // Source picker renders the held-only TokenList, not the discovery picker.
    expect(screen.getByTestId("token-list")).toBeInTheDocument();
    expect(screen.queryByTestId("swap-picker-sections")).toBeNull();
  });

  it("opens the destination picker (Swap to) when the receive card's asset selector is clicked", async () => {
    renderSwap();

    // Two AmountCard selectors render: [0] sell card (source), [1] receive card (destination).
    const selectors = await screen.findAllByTestId(
      "send-amount-edit-dest-asset",
    );
    expect(selectors.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      fireEvent.click(selectors[1]);
    });

    await waitFor(() => {
      expect(screen.getByText("Swap to")).toBeInTheDocument();
    });
  });

  it("emits swapSourceSelected with the picked source on source pick", async () => {
    jest.spyOn(UseSwapFromData, "useGetSwapFromData").mockReturnValue({
      state: {
        ...resolvedFromState,
        data: {
          ...resolvedFromState.data,
          filteredBalances: [
            {
              token: {
                code: "USDC",
                issuer: {
                  key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
                },
              },
              total: new BigNumber("100"),
              available: new BigNumber("100"),
            },
          ],
        },
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
      filterBalances: jest.fn(),
    } as any);

    renderSwap();

    const selectors = await screen.findAllByTestId(
      "send-amount-edit-dest-asset",
    );
    await act(async () => {
      fireEvent.click(selectors[0]);
    });

    // The held TokenList renders a clickable USDC row.
    const usdcRow = await screen.findByTestId(
      "SendRow-USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
    );
    await act(async () => {
      fireEvent.click(usdcRow);
    });

    const sourceCall = emitMetricMock.mock.calls.find(
      (c) => c[0] === "swap: source selected",
    );
    expect(sourceCall).toBeDefined();
    expect(sourceCall![1]).toMatchObject({
      tokenCode: "USDC",
      source: "balances",
    });
  });
});
