import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { getTestStore, Wrapper } from "popup/__testHelpers__";
import {
  initialState as transactionSubmissionInitialState,
  saveSwapBestPath,
} from "popup/ducks/transactionSubmission";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseSwapLiveQuote from "popup/components/swap/SwapAmount/hooks/useSwapLiveQuote";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as Internal from "@shared/api/internal";
import * as TokenList from "@shared/api/helpers/token-list";
import { getSwapQuoteKey } from "popup/helpers/swapQuote";

// Interpolates, so the fee inside "{{fee}} network fee" is checkable.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key.replace(/{{(\w+)}}/g, (_: string, name: string) =>
        String(opts?.[name] ?? `{{${name}}}`),
      ),
  }),
}));

const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const swapData = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "PUBLIC" },
  icons: {},
  userBalances: {
    balances: [
      {
        token: { type: "native", code: "XLM" },
        total: new BigNumber("100"),
        available: new BigNumber("100"),
        blockaidData: {},
      },
    ],
  },
  tokenPrices: { native: { currentPrice: "0.3" } },
};

const swapQuotes = {
  routes: [
    {
      source: "lifi",
      fromAmount: "5",
      toAmount: "1.85",
      fees: [],
      paths: [
        {
          share: "1",
          hops: [{ venue: "Aquarius", from: "XLM", to: USDC, pool: "p1" }],
        },
      ],
    },
  ],
  unavailable: [],
};

const quoteKey = (amount: string, destAsset = USDC) =>
  getSwapQuoteKey({
    mode: "send",
    amount,
    sourceAsset: "native",
    destAsset,
    networkDetails: MAINNET_NETWORK_DETAILS,
    publicKey: "G123",
  });

const renderSwapAmount = (transactionData: Record<string, unknown>) =>
  render(
    <Wrapper
      state={
        {
          settings: { networkDetails: MAINNET_NETWORK_DETAILS },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: "native",
              amount: "5",
              amountUsd: "0.00",
              destinationAmount: "1.85",
              allowedSlippage: "2",
              transactionFee: "",
              transactionTimeout: 180,
              memo: "",
              destination: "",
              path: [],
              destinationAsset: USDC,
              destinationTokenDetails: null,
              isToken: false,
              swapQuotes,
              swapQuoteKey: quoteKey("5"),
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
        goToNext={jest.fn()}
        goToEditSrc={jest.fn()}
        goToEditDst={jest.fn()}
      />
    </Wrapper>,
  );

const BODY =
  "We couldn't get a quote for this swap right now. Try a different amount or token pair, or try again later.";

const mockLiveQuote = (state: Record<string, boolean>) =>
  jest.spyOn(UseSwapLiveQuote, "useSwapLiveQuote").mockReturnValue({
    cancelLiveQuote: jest.fn(),
    ...state,
  } as any);

describe("SwapAmount quote unavailable line", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.IDLE, data: null, error: null },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    mockLiveQuote({});
    jest.spyOn(Internal, "getDiscoverData").mockResolvedValue([]);
    jest.spyOn(TokenList, "getCombinedAssetListData").mockResolvedValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  const noQuote = { destinationAmount: "0", swapQuotes: null };

  it("shows for the no-quote CTA state, with Review swap disabled", () => {
    renderSwapAmount(noQuote);
    const cta = screen.getByTestId("swap-amount-btn-continue");
    expect(cta).toHaveTextContent("Review swap");
    expect(cta).toBeDisabled();
    expect(screen.getByTestId("swap-quote-unavailable")).toHaveTextContent(
      "Quote unavailable",
    );
  });

  it("is hidden while a quote is loading", () => {
    // The stored quote is for another amount, so one for "5" is pending.
    renderSwapAmount({ ...noQuote, swapQuoteKey: quoteKey("4") });
    expect(screen.queryByTestId("swap-quote-unavailable")).toBeNull();
  });

  it("is hidden when a quote exists", () => {
    renderSwapAmount({});
    expect(screen.queryByTestId("swap-quote-unavailable")).toBeNull();
  });

  it("is hidden when the amount is empty", () => {
    renderSwapAmount({ ...noQuote, amount: "" });
    expect(screen.queryByTestId("swap-quote-unavailable")).toBeNull();
  });

  it("opens the sheet with the title and body, and closes it", async () => {
    renderSwapAmount(noQuote);
    expect(screen.queryByText(BODY)).toBeNull();
    fireEvent.click(screen.getByTestId("swap-quote-unavailable"));
    expect(screen.getByText(BODY)).toBeInTheDocument();
    expect(
      screen.getByTestId("QuoteUnavailableSheet__title"),
    ).toHaveTextContent("Quote unavailable");
    fireEvent.click(screen.getByTestId("QuoteUnavailableSheet__close"));
    await waitFor(() => expect(screen.queryByText(BODY)).toBeNull());
  });

  it("closes the sheet when a quote arrives", async () => {
    renderSwapAmount(noQuote);
    fireEvent.click(screen.getByTestId("swap-quote-unavailable"));
    expect(screen.getByText(BODY)).toBeInTheDocument();

    act(() => {
      getTestStore()!.dispatch(
        saveSwapBestPath({
          path: [],
          destinationAmount: "1.85",
          quotes: swapQuotes as any,
          key: quoteKey("5"),
        }),
      );
    });

    expect(screen.queryByTestId("swap-quote-unavailable")).toBeNull();
    await waitFor(() => expect(screen.queryByText(BODY)).toBeNull());
  });
});
