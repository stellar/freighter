import React from "react";
import { render } from "@testing-library/react";
import BigNumber from "bignumber.js";

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

const TOKEN_CONTRACT =
  "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";
const TOKEN = `TKN:${TOKEN_CONTRACT}`;
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const nativeBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
  minimumBalance: "1",
  blockaidData: {},
};

const tokenBalance = {
  token: { code: "TKN", issuer: { key: TOKEN_CONTRACT } },
  contractId: TOKEN_CONTRACT,
  total: new BigNumber("5000000000000000000"),
  decimals: 18,
  name: "Token",
  symbol: "TKN",
};

const renderSwapAmount = (
  transactionData: Record<string, unknown>,
  balances: unknown[] = [nativeBalance],
) => {
  jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
    state: {
      state: RequestState.SUCCESS,
      data: {
        type: AppDataType.RESOLVED,
        applicationState: "MNEMONIC_PHRASE_CONFIRMED",
        networkDetails: MAINNET_NETWORK_DETAILS,
        icons: {},
        userBalances: { balances },
        tokenPrices: {},
      },
      error: null,
    },
    fetchData: jest.fn().mockResolvedValue(undefined),
  } as any);
  return render(
    <Wrapper
      state={
        {
          settings: { networkDetails: MAINNET_NETWORK_DETAILS },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: "native",
              amount: "0",
              amountUsd: "0.00",
              destinationAmount: "0",
              allowedSlippage: "1",
              transactionFee: "",
              transactionTimeout: 180,
              destinationAsset: USDC,
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
};

describe("SwapAmount with Soroban contract tokens", () => {
  let simulate: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    simulate = jest
      .spyOn(UseSimulateSwapData, "useSimulateTxData")
      .mockReturnValue({
        state: { state: RequestState.IDLE, data: null, error: null },
        isQuoteExpired: false,
        fetchData: jest.fn().mockResolvedValue(undefined),
      } as any);
    jest
      .spyOn(FetchBackendV2, "fetchBackendV2")
      .mockResolvedValue({ status: 503, body: {} });
  });
  afterEach(() => jest.restoreAllMocks());

  const lastSimParams = () =>
    simulate.mock.calls[simulate.mock.calls.length - 1][0].simParams;

  it("builds with a held contract token's decimals, whatever isToken says", () => {
    // A classic destination picked after the source sets isToken to false.
    renderSwapAmount({ asset: TOKEN, isToken: false }, [
      nativeBalance,
      tokenBalance,
    ]);

    expect(lastSimParams()).toMatchObject({
      sourceDecimals: 18,
      destDecimals: 7,
    });
  });

  it("builds with the picked row's decimals for a contract token not held", () => {
    renderSwapAmount({
      destinationAsset: TOKEN,
      destinationTokenDetails: {
        tokenCode: "TKN",
        issuer: TOKEN_CONTRACT,
        requiresTrustline: false,
        decimals: 6,
      },
    });

    expect(lastSimParams()).toMatchObject({
      sourceDecimals: 7,
      destDecimals: 6,
    });
  });
});
