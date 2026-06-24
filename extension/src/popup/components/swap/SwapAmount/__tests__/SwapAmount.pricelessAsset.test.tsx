import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";

// Swap data where the source asset (native/XLM) has NO tokenPrices entry,
// simulating a priceless asset being selected as the source.
const swapDataNoPrices = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "TESTNET" },
  icons: {},
  userBalances: { balances: [] },
  tokenPrices: {},
};

describe("SwapAmount priceless source asset", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.IDLE, data: null, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
      isQuoteExpired: false,
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: swapDataNoPrices,
        error: null,
      },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("does NOT crash when rendered in fiat mode with a priceless source asset", async () => {
    const setInputType = jest.fn();

    // Rendering with inputType="fiat" while the source asset has no price is
    // the crash scenario: priceValue is null and was previously dereferenced as
    // priceValue! inside isAmountTooHigh (and validate / handleContinue).
    expect(() =>
      render(
        <Wrapper
          state={
            {
              transactionSubmission: {
                transactionData: {
                  asset: "native",
                  amount: "1",
                  amountUsd: "1.00",
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
          routes={["/"]}
        >
          <SwapAmount
            inputType="fiat"
            setInputType={setInputType}
            goBack={jest.fn()}
            goToNext={jest.fn()}
            goToEditSrc={jest.fn()}
            goToEditDst={jest.fn()}
          />
        </Wrapper>,
      ),
    ).not.toThrow();

    // The useEffect guard should reset inputType back to "crypto" because
    // the source asset has no USD price.
    await waitFor(() => {
      expect(setInputType).toHaveBeenCalledWith("crypto");
    });
  });

  it("renders the sell card without crashing when source has no price", () => {
    // Belt-and-suspenders: the component must at least mount and show the sell
    // card (render gate passed) even before the useEffect fires.
    render(
      <Wrapper
        state={
          {
            transactionSubmission: {
              transactionData: {
                asset: "native",
                amount: "0",
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
        routes={["/"]}
      >
        <SwapAmount
          inputType="fiat"
          setInputType={jest.fn()}
          goBack={jest.fn()}
          goToNext={jest.fn()}
          goToEditSrc={jest.fn()}
          goToEditDst={jest.fn()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("swap-sell-card")).toBeInTheDocument();
  });
});
