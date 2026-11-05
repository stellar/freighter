import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import BigNumber from "bignumber.js";
import { captureException } from "@sentry/browser";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as HorizonGetBestPath from "popup/helpers/horizonGetBestPath";
import * as XlmReserve from "popup/helpers/xlmReserve";

jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
const AQUA = "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

const swapData = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: MAINNET_NETWORK_DETAILS,
  icons: {},
  userBalances: {
    balances: [
      {
        token: { type: "native", code: "XLM" },
        total: new BigNumber("1"),
        available: new BigNumber("1"),
        blockaidData: {},
      },
      {
        token: { code: "USDC", issuer: { key: USDC_ISSUER } },
        total: new BigNumber("100"),
        available: new BigNumber("100"),
        blockaidData: {},
      },
    ],
  },
  tokenPrices: {},
};

const route = (fromAmount: string, toAmount: string, to: string) => ({
  source: "classic",
  fromAmount,
  toAmount,
  paths: [{ share: "1", hops: [{ venue: "stellar-dex", from: "USDC", to }] }],
  fees: [],
});

describe("SwapAmount swap-for-reserve quote", () => {
  let fetchBackendV2: jest.SpyInstance;
  let horizonReceive: jest.SpyInstance;

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
    jest
      .spyOn(XlmReserve, "shouldShowXlmReservePreflight")
      .mockReturnValue(true);
    horizonReceive = jest
      .spyOn(HorizonGetBestPath, "horizonGetBestReceivePath")
      .mockRejectedValue(new Error("Horizon must not be called"));
    fetchBackendV2 = jest
      .spyOn(FetchBackendV2, "fetchBackendV2")
      .mockImplementation(async ({ body }) => {
        const { mode } = JSON.parse(body!);
        const r =
          mode === "receive"
            ? route("3.25", "0.5102041", "XLM")
            : route("5", "40", AQUA);
        return {
          status: 200,
          body: { data: { routes: [r], unavailable: [] } },
        };
      });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const renderAndSwapForReserve = async () => {
    render(
      <Wrapper
        state={
          {
            settings: { networkDetails: MAINNET_NETWORK_DETAILS },
            transactionSubmission: {
              ...transactionSubmissionInitialState,
              transactionData: {
                ...transactionSubmissionInitialState.transactionData,
                asset: USDC,
                amount: "5",
                allowedSlippage: "2",
                destinationAsset: AQUA,
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

    await act(async () => {
      fireEvent.click(screen.getByTestId("swap-amount-btn-continue"));
    });
    await waitFor(() =>
      expect(screen.getByTestId("XlmReserveSheet")).toBeInTheDocument(),
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId("XlmReserveSheet__swap-for-reserve"));
    });
  };

  it("prefills the amount from a backend receive quote for ~0.5 XLM", async () => {
    await renderAndSwapForReserve();
    expect(fetchBackendV2).toHaveBeenCalledWith({
      method: "POST",
      path: "/swap/quotes?network=PUBLIC",
      body: JSON.stringify({
        account: "G123",
        mode: "receive",
        fromAsset: USDC,
        toAsset: "XLM",
        // 0.5 XLM / (1 - 2% slippage)
        amount: "0.5102041",
      }),
    });
    expect(horizonReceive).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        getTestStore()!.getState().transactionSubmission.transactionData.amount,
      ).toBe("3.2500000"),
    );
  });

  it("reports a classic outage instead of treating it as no route", async () => {
    fetchBackendV2.mockImplementation(async () => ({
      status: 200,
      body: {
        data: {
          routes: [],
          unavailable: [{ source: "classic", reason: "timeout" }],
        },
      },
    }));

    await renderAndSwapForReserve();

    await waitFor(() =>
      expect(captureException).toHaveBeenCalledWith(
        "Swap quotes: classic source timeout",
      ),
    );
    expect(
      getTestStore()!.getState().transactionSubmission.transactionData.amount,
    ).toBe("5");
  });

  it("does not report a rejected receive quote to Sentry again", async () => {
    fetchBackendV2.mockImplementation(async () => ({
      status: 400,
      body: { error: "invalid amount" },
    }));

    await renderAndSwapForReserve();

    expect(fetchBackendV2).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('"mode":"receive"'),
      }),
    );
    expect(captureException).not.toHaveBeenCalled();
  });
});
