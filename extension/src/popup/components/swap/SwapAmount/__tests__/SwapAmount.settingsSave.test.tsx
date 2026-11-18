import React from "react";
import BigNumber from "bignumber.js";
import { render, act, screen, fireEvent } from "@testing-library/react";

import { RequestState } from "constants/request";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";

const AQUA = "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

const swapData = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "TESTNET" },
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
  tokenPrices: {},
};

const renderSwapAmount = (amount: string) =>
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
              amount,
              amountUsd: "0.00",
              destinationAmount: "0",
              allowedSlippage: "2",
              transactionFee: "0.00001",
              transactionTimeout: 180,
              memo: "",
              destination: "",
              path: [],
              destinationAsset: AQUA,
              destinationTokenDetails: null,
              isToken: false,
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

describe("SwapAmount settings save", () => {
  let simulate: jest.Mock;

  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    simulate = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: { state: RequestState.IDLE, data: null, error: null },
      isQuoteExpired: false,
      fetchData: simulate,
    } as any);
    jest.spyOn(FetchBackendV2, "fetchBackendV2").mockResolvedValue({
      status: 200,
      body: { data: { routes: [], unavailable: [] } },
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const saveSettings = async () => {
    fireEvent.click(screen.getByTestId("swap-amount-settings-btn"));
    await act(async () => {
      fireEvent.click(await screen.findByText("Save"));
    });
  };

  it("does not quote when no amount has been entered", async () => {
    renderSwapAmount("0");
    await saveSettings();
    expect(simulate).not.toHaveBeenCalled();
  });

  it("re-simulates with the entered amount", async () => {
    renderSwapAmount("5");
    await saveSettings();
    expect(simulate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "5" }),
    );
  });
});
