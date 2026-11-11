import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseSwapLiveQuote from "popup/components/swap/SwapAmount/hooks/useSwapLiveQuote";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as Internal from "@shared/api/internal";
import * as TokenList from "@shared/api/helpers/token-list";
import { getSwapQuoteKey } from "popup/helpers/swapQuote";

// Interpolates, so the fee inside "{{fee}} XLM network fee" is checkable.
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

const AQUA = "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

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

describe("SwapAmount details sheet", () => {
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
    jest.spyOn(UseSwapLiveQuote, "useSwapLiveQuote").mockReturnValue({
      cancelLiveQuote: jest.fn(),
    } as any);
    jest.spyOn(Internal, "getDiscoverData").mockResolvedValue([]);
    jest.spyOn(TokenList, "getCombinedAssetListData").mockResolvedValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  it("opens Details from See details, then Route, then back", async () => {
    renderSwapAmount({});
    expect(screen.getByTestId("swap-details-link")).toHaveTextContent(
      "0.00002 XLM network fee",
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("swap-see-details"));
    });
    expect(screen.getByTestId("SwapDetails__fee")).toHaveTextContent(
      "0.00002 XLM (<$0.01)",
    );
    expect(screen.getByTestId("SwapDetails__rate")).toHaveTextContent(
      "1 XLM ≈ 0.37 USDC",
    );

    fireEvent.click(screen.getByTestId("SwapDetails__route"));
    expect(screen.getByTestId("SwapRoute")).toBeInTheDocument();
    expect(screen.getByTestId("SwapRoute__path-0")).toHaveTextContent("100%");

    fireEvent.click(screen.getByTestId("SwapRoute__back"));
    expect(screen.getByTestId("SwapDetails")).toBeInTheDocument();
  });

  it("hides the Route row when no backend quotes are stored", async () => {
    renderSwapAmount({ swapQuotes: null });
    await act(async () => {
      fireEvent.click(screen.getByTestId("swap-see-details"));
    });
    expect(screen.getByTestId("SwapDetails")).toBeInTheDocument();
    expect(screen.queryByTestId("SwapDetails__route")).toBeNull();
  });

  it("reads a comma-formatted sell amount", async () => {
    renderSwapAmount({
      amount: "1,500",
      destinationAmount: "555",
      swapQuoteKey: quoteKey("1500"),
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("swap-see-details"));
    });
    expect(screen.getByTestId("SwapDetails__rate")).toHaveTextContent(
      "1 XLM ≈ 0.37 USDC",
    );
  });

  it.each([
    ["the amount", { amount: "50" }],
    ["the bought token", { swapQuoteKey: quoteKey("5", AQUA) }],
    ["a cleared key", { swapQuoteKey: null }],
  ])(
    "shows no See details link while the quote is for other inputs (%s)",
    (_, transactionData) => {
      renderSwapAmount(transactionData);
      expect(screen.queryByTestId("swap-details-link")).toBeNull();
    },
  );

  describe("fee display", () => {
    const withRoute = (route: Record<string, unknown>) => ({
      swapQuotes: {
        ...swapQuotes,
        routes: [{ ...swapQuotes.routes[0], ...route }],
      },
    });

    it("adds a LI.FI route's resource fee to the inclusion fee", async () => {
      renderSwapAmount(withRoute({ resourceFee: "0.0858459" }));
      expect(screen.getByTestId("swap-amount-fee-display")).toHaveTextContent(
        "0.0858659 XLM",
      );
      expect(screen.getByTestId("swap-details-link")).toHaveTextContent(
        "0.0858659 XLM network fee",
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId("swap-see-details"));
      });
      expect(screen.getByTestId("SwapDetails__fee")).toHaveTextContent(
        "0.0858659 XLM ($0.03)",
      );
      expect(screen.getByTestId("SwapDetails")).toHaveTextContent(
        "Fees description soroban",
      );
    });

    it("shows the inclusion fee alone on a classic route", async () => {
      renderSwapAmount(withRoute({ source: "classic" }));
      expect(screen.getByTestId("swap-amount-fee-display")).toHaveTextContent(
        "0.00002 XLM",
      );
      await act(async () => {
        fireEvent.click(screen.getByTestId("swap-see-details"));
      });
      expect(screen.getByTestId("SwapDetails__fee")).toHaveTextContent(
        "0.00002 XLM (<$0.01)",
      );
      expect(screen.getByTestId("SwapDetails")).not.toHaveTextContent(
        "Fees description soroban",
      );
    });

    it("ignores the resource fee of a quote for other inputs", () => {
      renderSwapAmount({
        ...withRoute({ resourceFee: "0.0858459" }),
        amount: "50",
      });
      expect(screen.queryByTestId("swap-details-link")).toBeNull();
      expect(screen.getByTestId("swap-amount-fee-display")).toHaveTextContent(
        "0.00002 XLM",
      );
    });
  });

  describe("fees held back before review", () => {
    const xlm = (total: string) => ({
      token: { type: "native", code: "XLM" },
      total: new BigNumber(total),
      available: new BigNumber(total),
      minimumBalance: new BigNumber("1"),
      blockaidData: {},
    });
    const usdc = {
      token: {
        code: "USDC",
        issuer: { key: USDC.split(":")[1] },
      },
      total: new BigNumber("100"),
      available: new BigNumber("100"),
      blockaidData: {},
    };
    const withBalances = (balances: unknown[]) =>
      jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
        state: {
          state: RequestState.SUCCESS,
          data: { ...swapData, userBalances: { balances } },
          error: null,
        },
        fetchData: jest.fn().mockResolvedValue(undefined),
      } as any);
    const quotes = (route: Record<string, unknown>) => ({
      ...swapQuotes,
      routes: [{ ...swapQuotes.routes[0], ...route }],
    });
    const clickMax = () =>
      fireEvent.click(screen.getByTestId("SendAmountSetMax"));
    const savedAmount = () =>
      getTestStore()!.getState().transactionSubmission.transactionData.amount;

    // 100 XLM - 1 minimum balance - 0.5 new-trustline reserve - fees.
    it("Max on an XLM source leaves a LI.FI route's resource fee", () => {
      withBalances([xlm("100")]);
      renderSwapAmount({ swapQuotes: quotes({ resourceFee: "0.0858459" }) });
      clickMax();
      expect(savedAmount()).toBe("98.4141341");
    });

    it("Max on an XLM source holds back the inclusion fee alone on a classic route", () => {
      withBalances([xlm("100")]);
      renderSwapAmount({ swapQuotes: quotes({ source: "classic" }) });
      clickMax();
      expect(savedAmount()).toBe("98.49998");
    });

    const nonXlmSource = (route: Record<string, unknown>) => ({
      asset: USDC,
      destinationAsset: "native",
      swapQuotes: quotes(route),
      swapQuoteKey: getSwapQuoteKey({
        mode: "send",
        amount: "5",
        sourceAsset: USDC,
        destAsset: "native",
        networkDetails: MAINNET_NETWORK_DETAILS,
        publicKey: "G123",
      }),
    });

    // 0.0001 XLM spendable covers the 0.00001 inclusion fee, not the total.
    it("flags a non-XLM source short of XLM for the resource fee", () => {
      withBalances([xlm("1.0001"), usdc]);
      renderSwapAmount(nonXlmSource({ resourceFee: "0.0858459" }));
      expect(screen.getByTestId("swap-amount-btn-continue")).toHaveTextContent(
        "Not enough XLM for network fees",
      );
    });

    it("lets a non-XLM source through on a classic route", () => {
      withBalances([xlm("1.0001"), usdc]);
      renderSwapAmount(nonXlmSource({ source: "classic" }));
      expect(screen.getByTestId("swap-amount-btn-continue")).toHaveTextContent(
        "Review swap",
      );
    });
  });

  it("shows no See details link without a quote", () => {
    renderSwapAmount({ destinationAmount: "0", swapQuotes: null });
    expect(screen.queryByTestId("swap-details-link")).toBeNull();
  });
});
