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
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as XlmReserve from "popup/helpers/xlmReserve";

// Native-XLM balance that makes `availableBalance` > 0 so the "Review swap"
// button is not disabled.
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

describe("SwapAmount CTA gate", () => {
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
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("opens the XLM-reserve sheet instead of review when pre-flight gates", async () => {
    const spyReserve = jest
      .spyOn(XlmReserve, "shouldShowXlmReservePreflight")
      .mockReturnValue(true);
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
                destinationAsset:
                  "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
                destinationTokenDetails: {
                  tokenCode: "AQUA",
                  requiresTrustline: true,
                  decimals: 7,
                },
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
    await act(async () => {
      fireEvent.click(screen.getByTestId("swap-amount-btn-continue"));
    });
    expect(spyReserve).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId("XlmReserveSheet")).toBeInTheDocument(),
    );
  });

  it("does NOT open the reserve sheet when shouldShowXlmReservePreflight returns false", async () => {
    jest
      .spyOn(XlmReserve, "shouldShowXlmReservePreflight")
      .mockReturnValue(false);
    render(
      <Wrapper
        state={
          {
            transactionSubmission: {
              transactionData: {
                asset: "native",
                amount: "5",
                destinationAsset:
                  "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
                destinationTokenDetails: {
                  tokenCode: "AQUA",
                  requiresTrustline: true,
                  decimals: 7,
                },
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
    fireEvent.click(screen.getByTestId("swap-amount-btn-continue"));
    await waitFor(() => {
      expect(screen.queryByTestId("XlmReserveSheet")).not.toBeInTheDocument();
    });
  });
});
