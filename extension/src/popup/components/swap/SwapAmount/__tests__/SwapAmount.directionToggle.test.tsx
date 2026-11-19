import React from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";

const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const USDC_CANONICAL = `USDC:${USDC_ISSUER}`;

const nativeBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
};
const usdcBalance = {
  token: { code: "USDC", issuer: { key: USDC_ISSUER } },
  total: new BigNumber("50"),
  available: new BigNumber("50"),
};

const TOKEN_CONTRACT =
  "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";
const TOKEN_CANONICAL = `TKN:${TOKEN_CONTRACT}`;
const tokenBalance = {
  token: { code: "TKN", issuer: { key: TOKEN_CONTRACT } },
  contractId: TOKEN_CONTRACT,
  total: new BigNumber("5000000000000000000"),
  available: new BigNumber("5000000000000000000"),
  decimals: 18,
  name: "Token",
  symbol: "TKN",
};

const makeSwapData = (balances: unknown[]) => ({
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "TESTNET" },
  icons: {},
  userBalances: { balances },
  tokenPrices: {},
});

const renderAmount = (transactionData: Record<string, unknown>) =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            soroswapTokens: [],
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

describe("SwapAmount direction toggle", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.IDLE, data: null, error: null },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    // Avoid the live-quote network call when a destination + amount are set.
    jest.spyOn(FetchBackendV2, "fetchBackendV2").mockResolvedValue({
      status: 200,
      body: { data: { routes: [], unavailable: [] } },
    });
  });
  afterEach(() => jest.restoreAllMocks());

  const mockAmountData = (balances: unknown[]) =>
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: makeSwapData(balances),
        error: null,
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

  it("swaps positions when the destination is a held token", async () => {
    mockAmountData([nativeBalance, usdcBalance]);
    // Source XLM, destination held USDC.
    renderAmount({ destinationAsset: USDC_CANONICAL });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Swap direction"));
    });

    // Source becomes USDC, receive becomes XLM.
    const sell = screen.getByTestId("swap-sell-card");
    const receive = screen.getByTestId("swap-receive-card");
    expect(within(sell).getByText("USDC")).toBeInTheDocument();
    expect(within(receive).getByText("XLM")).toBeInTheDocument();
  });

  it("resets a non-held destination to (+) Select instead of moving it to source", async () => {
    // USDC is NOT in the account balances -> non-held.
    mockAmountData([nativeBalance]);
    renderAmount({
      destinationAsset: USDC_CANONICAL,
      destinationTokenDetails: {
        tokenCode: "USDC",
        issuer: USDC_ISSUER,
        requiresTrustline: true,
        decimals: 7,
        iconUrl: "https://icons/usdc.png",
        source: "search",
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Swap direction"));
    });

    // The non-held USDC is dropped: source returns to "(+) Select" and the held
    // XLM moves into the receive slot.
    const sell = screen.getByTestId("swap-sell-card");
    const receive = screen.getByTestId("swap-receive-card");
    expect(within(sell).getByText("Select")).toBeInTheDocument();
    expect(within(receive).getByText("XLM")).toBeInTheDocument();
    expect(within(sell).queryByText("USDC")).toBeNull();
  });

  // isToken drives the review's contract memo/muxed check against the SOURCE
  // (getContractIdFromTransactionData reads srcAsset), so it follows the
  // token that lands in the sell slot.
  const isToken = () =>
    getTestStore()!.getState().transactionSubmission.transactionData.isToken;

  it("sets isToken when a held contract token moves into the sell slot", async () => {
    mockAmountData([nativeBalance, tokenBalance]);
    renderAmount({ destinationAsset: TOKEN_CANONICAL, isToken: false });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Swap direction"));
    });

    expect(isToken()).toBe(true);
  });

  it("clears isToken when a classic asset moves into the sell slot", async () => {
    mockAmountData([nativeBalance, tokenBalance]);
    renderAmount({
      asset: TOKEN_CANONICAL,
      destinationAsset: "native",
      isToken: true,
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Swap direction"));
    });

    expect(isToken()).toBe(false);
  });
});
