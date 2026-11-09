import React from "react";
import { render, act, screen, within, fireEvent } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import {
  initialState as transactionSubmissionInitialState,
  saveAmount,
} from "popup/ducks/transactionSubmission";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseSwapLiveQuote from "popup/components/swap/SwapAmount/hooks/useSwapLiveQuote";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";
import * as HorizonGetBestPath from "popup/helpers/horizonGetBestPath";

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

const AQUA = "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const classicRoute = {
  source: "classic",
  fromAmount: "5",
  toAmount: "42",
  paths: [
    {
      share: "1",
      hops: [
        { venue: "stellar-dex", from: "XLM", to: USDC },
        { venue: "stellar-dex", from: USDC, to: AQUA },
      ],
    },
  ],
  fees: [],
};
const lifiRoute = { ...classicRoute, source: "lifi", toAmount: "50" };

const quotesReply = (routes: unknown[]) => ({
  status: 200,
  body: { data: { routes, unavailable: [] } },
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
              destinationAmount: "0",
              allowedSlippage: "2",
              transactionFee: "",
              transactionTimeout: 180,
              memo: "",
              destination: "",
              path: [],
              destinationAsset: AQUA,
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
        goToNext={jest.fn()}
        goToEditSrc={jest.fn()}
        goToEditDst={jest.fn()}
      />
    </Wrapper>,
  );

describe("SwapAmount live receive-amount quote", () => {
  let fetchBackendV2: jest.SpyInstance;
  let horizonGetBestPath: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    // The review-time simulation hook is still mounted; keep it inert.
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.IDLE, data: null, error: null },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    fetchBackendV2 = jest
      .spyOn(FetchBackendV2, "fetchBackendV2")
      .mockResolvedValue(quotesReply([lifiRoute, classicRoute]));
    horizonGetBestPath = jest
      .spyOn(HorizonGetBestPath, "horizonGetBestPath")
      .mockRejectedValue(new Error("Horizon must not be called"));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const settle = () =>
    act(async () => {
      jest.advanceTimersByTime(600);
    });

  const cta = () => screen.getByTestId("swap-amount-btn-continue");

  it("runs a debounced send quote against the backend, not Horizon", async () => {
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });

    // Debounced: nothing fires synchronously.
    expect(fetchBackendV2).not.toHaveBeenCalled();

    await settle();

    expect(fetchBackendV2).toHaveBeenCalledTimes(1);
    expect(fetchBackendV2).toHaveBeenCalledWith({
      method: "POST",
      path: "/swap/quotes?network=PUBLIC",
      body: JSON.stringify({
        account: "G123",
        mode: "send",
        fromAsset: "XLM",
        toAsset: AQUA,
        amount: "5",
      }),
    });
    expect(horizonGetBestPath).not.toHaveBeenCalled();
  });

  it("stores the classic route's amount and path, and the full response", async () => {
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });

    await settle();

    const { transactionData } =
      getTestStore()!.getState().transactionSubmission;
    expect(transactionData.destinationAmount).toBe("42");
    expect(transactionData.path).toEqual([USDC]);
    expect(transactionData.swapQuotes).toEqual({
      routes: [lifiRoute, classicRoute],
      unavailable: [],
    });
    expect(transactionData.swapQuoteKey).toEqual({
      account: "G123",
      network: "PUBLIC",
      networkUrl: MAINNET_NETWORK_DETAILS.networkUrl,
      mode: "send",
      sourceAsset: "native",
      destAsset: AQUA,
      amount: "5",
    });
    expect(
      within(screen.getByTestId("swap-receive-card")).getByDisplayValue("42"),
    ).toBeInTheDocument();
    expect(cta()).toHaveTextContent("Review swap");
  });

  it("shows no quote when the response has no classic route", async () => {
    fetchBackendV2.mockResolvedValue(quotesReply([lifiRoute]));
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });

    await settle();

    expect(fetchBackendV2).toHaveBeenCalled();
    expect(cta()).toHaveTextContent("No quote available");
    expect(cta()).toBeDisabled();
  });

  it("shows no quote on empty routes", async () => {
    fetchBackendV2.mockResolvedValue(quotesReply([]));
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });

    await settle();

    expect(fetchBackendV2).toHaveBeenCalled();
    expect(cta()).toHaveTextContent("No quote available");
  });

  it("treats a 400 as no quote", async () => {
    fetchBackendV2.mockResolvedValue({
      status: 400,
      body: { error: "invalid amount" },
    });
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });

    await settle();

    expect(fetchBackendV2).toHaveBeenCalled();
    expect(cta()).toHaveTextContent("No quote available");
  });

  it.each([502, 503])(
    "shows swaps as temporarily unavailable on a %s",
    async (status) => {
      fetchBackendV2.mockResolvedValue({ status, body: { error: "x" } });
      renderSwapAmount({ amount: "5", destinationAsset: AQUA });

      await settle();

      expect(cta()).toHaveTextContent("Swaps are temporarily unavailable");
      expect(cta()).toBeDisabled();
    },
  );

  it("shows swaps as temporarily unavailable when the backend is unreachable", async () => {
    fetchBackendV2.mockRejectedValue(new TypeError("Failed to fetch"));
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });

    await settle();

    expect(cta()).toHaveTextContent("Swaps are temporarily unavailable");
  });

  it("shows swaps as temporarily unavailable when classic errored", async () => {
    fetchBackendV2.mockResolvedValue({
      status: 200,
      body: {
        data: {
          routes: [lifiRoute],
          unavailable: [{ source: "classic", reason: "timeout" }],
        },
      },
    });
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });

    await settle();

    expect(cta()).toHaveTextContent("Swaps are temporarily unavailable");
  });

  it("drops a quote that lands after the screen unmounts", async () => {
    let resolve: (v: unknown) => void = () => {};
    fetchBackendV2.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderSwapAmount({
      amount: "5",
      destinationAsset: AQUA,
    });
    await settle();
    expect(fetchBackendV2).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      resolve(quotesReply([classicRoute]));
    });

    const { transactionData } =
      getTestStore()!.getState().transactionSubmission;
    expect(transactionData.destinationAmount).toBe("0");
    expect(transactionData.swapQuotes).toBeNull();
  });

  it("clears the unavailable state once a quote succeeds", async () => {
    fetchBackendV2.mockResolvedValueOnce({ status: 503, body: {} });
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });
    await settle();
    expect(cta()).toHaveTextContent("Swaps are temporarily unavailable");

    await act(async () => {
      getTestStore()!.dispatch(saveAmount("6"));
    });
    await settle();

    expect(cta()).toHaveTextContent("Review swap");
  });

  describe("while the quote for the current inputs is pending", () => {
    const pendingQuote = () => {
      let resolve: (v: unknown) => void = () => {};
      fetchBackendV2.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );
      return () =>
        act(async () => {
          resolve(quotesReply([classicRoute]));
        });
    };
    const receiveCard = () => screen.getByTestId("swap-receive-card");
    const expectQuoteLoading = () => {
      expect(cta()).toHaveTextContent("Review swap");
      expect(cta()).toBeDisabled();
      expect(cta().querySelector(".Loader")).not.toBeNull();
      expect(
        within(receiveCard()).getByTestId("amount-card-amount-loading"),
      ).toBeInTheDocument();
      expect(within(receiveCard()).queryByRole("textbox")).toBeNull();
    };

    it("shows the CTA and the receive amount loading during the debounce and the fetch", async () => {
      pendingQuote();
      renderSwapAmount({ amount: "5", destinationAsset: AQUA });

      expectQuoteLoading();
      await settle();
      expect(fetchBackendV2).toHaveBeenCalledTimes(1);
      expectQuoteLoading();
    });

    it("shows loading when the stored quote is for other inputs, before the live-quote flag flips", () => {
      jest.spyOn(UseSwapLiveQuote, "useSwapLiveQuote").mockReturnValue({
        isLiveQuoteLoading: false,
        isSwapUnavailable: false,
        cancelLiveQuote: jest.fn(),
      });
      renderSwapAmount({
        amount: "6",
        destinationAsset: AQUA,
        destinationAmount: "42",
        swapQuoteKey: {
          account: "G123",
          network: "PUBLIC",
          networkUrl: MAINNET_NETWORK_DETAILS.networkUrl,
          mode: "send",
          sourceAsset: "native",
          destAsset: AQUA,
          amount: "5",
        },
      });

      expectQuoteLoading();
    });

    it("enables Review swap once the matching quote lands", async () => {
      const resolveQuote = pendingQuote();
      renderSwapAmount({ amount: "5", destinationAsset: AQUA });
      await settle();
      expectQuoteLoading();

      await resolveQuote();

      expect(cta()).toHaveTextContent("Review swap");
      expect(cta()).toBeEnabled();
      expect(cta().querySelector(".Loader")).toBeNull();
      expect(
        within(receiveCard()).queryByTestId("amount-card-amount-loading"),
      ).toBeNull();
      expect(within(receiveCard()).getByDisplayValue("42")).toBeInTheDocument();
    });

    it("shows insufficient balance without waiting for the quote", async () => {
      pendingQuote();
      renderSwapAmount({ amount: "500", destinationAsset: AQUA });
      await settle();

      expect(cta()).toHaveTextContent("Insufficient balance");
      expect(cta()).toBeDisabled();
      expect(cta().querySelector(".Loader")).toBeNull();
    });
  });

  it("does not start the review while a live quote is in flight", async () => {
    fetchBackendV2.mockReturnValue(new Promise(() => {}));
    const fetchSimulation = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.IDLE, data: null, error: null },
      isQuoteExpired: false,
      fetchData: fetchSimulation,
    } as any);
    renderSwapAmount({ amount: "5", destinationAsset: AQUA });
    await settle();

    await act(async () => {
      fireEvent.click(cta());
    });

    expect(fetchSimulation).not.toHaveBeenCalled();
  });

  it("quotes a percentage of a tiny balance as a plain decimal", async () => {
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: {
          ...swapData,
          userBalances: {
            balances: [
              nativeBalance,
              {
                token: {
                  code: "USDC",
                  issuer: { key: USDC.split(":")[1] },
                },
                total: new BigNumber("0.0000004"),
                available: new BigNumber("0.0000004"),
                blockaidData: {},
              },
            ],
          },
        },
        error: null,
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    renderSwapAmount({ asset: USDC, amount: "0", destinationAsset: AQUA });

    await act(async () => {
      fireEvent.click(screen.getByText("25%"));
    });
    await settle();

    expect(
      getTestStore()!.getState().transactionSubmission.transactionData.amount,
    ).toBe("0.0000001");
    expect(JSON.parse(fetchBackendV2.mock.calls[0][0].body).amount).toBe(
      "0.0000001",
    );
  });

  it("does not quote when there is no destination asset", async () => {
    renderSwapAmount({ amount: "5", destinationAsset: "" });

    await settle();

    expect(fetchBackendV2).not.toHaveBeenCalled();
  });
});
