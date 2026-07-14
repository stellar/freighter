import React from "react";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as HorizonGetBestPath from "popup/helpers/horizonGetBestPath";

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
    jest
      .spyOn(HorizonGetBestPath, "horizonGetBestPath")
      .mockResolvedValue(null as any);
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
});
