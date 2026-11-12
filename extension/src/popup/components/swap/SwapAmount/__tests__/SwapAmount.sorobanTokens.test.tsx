import React from "react";
import { render } from "@testing-library/react";
import BigNumber from "bignumber.js";
import { Asset, Networks } from "stellar-sdk";

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
import { getSwapDerivedData } from "popup/components/swap/SwapAmount/helpers/getSwapDerivedData";

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

    expect(lastSimParams()).toMatchObject({ sourceDecimals: 18 });
    expect(lastSimParams().destDecimals).toBeUndefined();
  });

  it("builds an unheld contract token with the decimals read at pick", () => {
    renderSwapAmount({
      destinationAsset: TOKEN,
      destinationTokenDetails: {
        tokenCode: "TKN",
        issuer: TOKEN_CONTRACT,
        requiresTrustline: false,
        decimals: 6,
      },
    });

    expect(lastSimParams().destDecimals).toBe(6);
  });

  it("leaves a destination that never went through the picker to be read at build", () => {
    renderSwapAmount({
      destinationAsset: TOKEN,
      destinationTokenDetails: null,
    });

    expect(lastSimParams().destDecimals).toBeUndefined();
  });

  it("adds no trustline into a contract token the account doesn't hold", () => {
    renderSwapAmount({ destinationAsset: TOKEN });

    expect(lastSimParams().destRequiresTrustline).toBe(false);
  });

  // A SAC added by contract ID without a trustline is held Soroban-shaped,
  // named after its classic asset (injectLocalTokenBalances).
  describe("a SAC held by its contract ID", () => {
    const USDC_ISSUER = USDC.split(":")[1];
    const sacId = new Asset("USDC", USDC_ISSUER).contractId(Networks.PUBLIC);
    const sacBalance = {
      token: { code: "USDC", issuer: { key: sacId } },
      contractId: sacId,
      total: new BigNumber(0),
      decimals: 7,
      name: USDC,
      symbol: "USDC",
    };

    it("needs the classic asset's trustline", () => {
      renderSwapAmount({ destinationAsset: `USDC:${sacId}` }, [
        nativeBalance,
        sacBalance,
      ]);

      expect(lastSimParams().destRequiresTrustline).toBe(true);
    });

    it("needs none when the trustline exists", () => {
      const usdcTrustline = {
        token: {
          type: "credit_alphanum4",
          code: "USDC",
          issuer: { key: USDC_ISSUER },
        },
        total: new BigNumber(1),
        available: new BigNumber(1),
      };
      renderSwapAmount({ destinationAsset: `USDC:${sacId}` }, [
        nativeBalance,
        sacBalance,
        usdcTrustline,
      ]);

      expect(lastSimParams().destRequiresTrustline).toBe(false);
    });
  });
});

describe("getSwapDerivedData destination identity", () => {
  it("knows a held contract token by its contract, whatever code the pick carried", () => {
    const derived = getSwapDerivedData({
      data: {
        type: AppDataType.RESOLVED,
        networkDetails: MAINNET_NETWORK_DETAILS,
        icons: {},
        userBalances: { balances: [nativeBalance, tokenBalance] },
        tokenPrices: {},
      } as any,
      asset: "native",
      // stellar.expert's code for the contract the account holds as TKN.
      destinationAsset: `ABC:${TOKEN_CONTRACT}`,
      destinationAmount: "1",
      destinationTokenDetails: null,
      amount: "1",
      amountUsd: "0",
      fee: "0.00001",
      networkDetails: MAINNET_NETWORK_DETAILS,
      inputType: "crypto",
      isQuoteForInputs: false,
      destRequiresTrustline: false,
    });

    expect(derived.destinationIsNonHeld).toBe(false);
  });
});

describe("getSwapDerivedData with a contract token sold", () => {
  const derive = (xlm: string) =>
    getSwapDerivedData({
      data: {
        type: AppDataType.RESOLVED,
        networkDetails: MAINNET_NETWORK_DETAILS,
        icons: {},
        userBalances: {
          balances: [
            { ...nativeBalance, total: new BigNumber(xlm) },
            tokenBalance,
          ],
        },
        tokenPrices: {},
      } as any,
      asset: TOKEN,
      destinationAsset: USDC,
      destinationAmount: "1",
      destinationTokenDetails: null,
      amount: "1",
      amountUsd: "0",
      fee: "0.00001",
      networkDetails: MAINNET_NETWORK_DETAILS,
      inputType: "crypto",
      isQuoteForInputs: true,
      destRequiresTrustline: true,
    });

  it("does not offer it to swap for the XLM reserve: receive quotes are classic-only", () => {
    const derived = derive("1");

    expect(derived.sourceIsNonXlmClassic).toBe(false);
    expect(derived.canSwapForReserve).toBe(false);
  });

  it("still needs XLM for the network fee", () => {
    expect(derive("1").insufficientXlmForFees).toBe(true);
  });
});
