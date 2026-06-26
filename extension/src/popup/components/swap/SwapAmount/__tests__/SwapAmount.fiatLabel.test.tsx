import React from "react";
import { render, screen, within } from "@testing-library/react";
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

const makeSwapData = (tokenPrices: Record<string, unknown>) => ({
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "PUBLIC" },
  icons: {},
  userBalances: { balances: [nativeBalance] },
  tokenPrices,
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

describe("SwapAmount fiat label", () => {
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
    jest
      .spyOn(HorizonGetBestPath, "horizonGetBestPath")
      .mockResolvedValue(null as any);
  });
  afterEach(() => jest.restoreAllMocks());

  const mockAmountData = (tokenPrices: Record<string, unknown>) =>
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: makeSwapData(tokenPrices),
        error: null,
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

  it("shows '--' on both cards when the selected assets have no price", () => {
    mockAmountData({});
    // Source XLM and destination USDC, neither priced.
    renderAmount({ asset: "native", destinationAsset: USDC_CANONICAL });

    expect(
      within(screen.getByTestId("swap-sell-card")).getByText("--"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("swap-receive-card")).getByText("--"),
    ).toBeInTheDocument();
  });

  it("shows '$0.00' (not hidden) for the '(+) Select' source state", () => {
    mockAmountData({});
    // No source asset selected -> "(+) Select".
    renderAmount({ asset: "", destinationAsset: "" });

    // Both cards are in the "(+) Select" state and show $0.00, not "--".
    expect(
      within(screen.getByTestId("swap-sell-card")).getByText("$0.00"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("swap-receive-card")).getByText("$0.00"),
    ).toBeInTheDocument();
  });

  it("shows the USD value when the source is priced", () => {
    mockAmountData({ native: { currentPrice: "0.5" } });
    // 5 XLM * $0.5 = $2.5x on the sell card (exact formatting aside).
    renderAmount({ asset: "native", amount: "5" });

    expect(
      within(screen.getByTestId("swap-sell-card")).getByText(/^\$2/),
    ).toBeInTheDocument();
  });
});
