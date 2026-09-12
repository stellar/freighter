import React from "react";
import { Provider } from "react-redux";
import { act, renderHook } from "@testing-library/react";
import BigNumber from "bignumber.js";
import {
  Account,
  Address,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from "stellar-sdk";

import * as ApiInternal from "@shared/api/internal";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import * as MuxedAddress from "helpers/muxedAddress";
import { makeDummyStore } from "popup/__testHelpers__";
import { initialState as submissionInitialState } from "popup/ducks/transactionSubmission";
import * as AccountHelpers from "popup/helpers/account";
import * as Soran from "popup/helpers/soran";
import { SimulateResult, useSimulateTxData } from "../useSimulateTxData";

const mockFetchBalances = jest.fn();
const mockScanTx = jest.fn();

jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
}));
jest.mock("popup/helpers/blockaid", () => ({
  useScanTx: () => ({ scanTx: mockScanTx }),
}));
jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

const PAYER = Keypair.random().publicKey();
const RECIPIENT = Keypair.random().publicKey();
const CONTRACT = "CCVKI6UYJDO34LO4D653IXCTPBGJOHJSJGSIOB4A46IH4ULNHS2MPQL7";
const NETWORK = TESTNET_NETWORK_DETAILS;

const buildTransfer = (amount: bigint) =>
  new TransactionBuilder(new Account(PAYER, "0"), {
    fee: "100",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      new Contract(CONTRACT).call(
        "transfer",
        new Address(PAYER).toScVal(),
        new Address(RECIPIENT).toScVal(),
        nativeToScVal(amount, { type: "i128" }),
      ),
    )
    .setTimeout(0)
    .build()
    .toXDR();

const renderSimulation = (amount: string, decimals: number) => {
  const balances: AccountBalances = {
    isFunded: true,
    subentryCount: 0,
    balances: [
      {
        contractId: CONTRACT,
        token: { code: "TOKEN", issuer: { key: CONTRACT } },
        symbol: "TOKEN",
        name: "Test token",
        decimals,
        total: new BigNumber("1000000000000000000"),
      },
    ],
  };
  mockFetchBalances.mockResolvedValue(balances);
  const store = makeDummyStore({
    auth: { publicKey: PAYER },
    transactionSubmission: {
      ...submissionInitialState,
      transactionData: {
        ...submissionInitialState.transactionData,
        asset: `TOKEN:${CONTRACT}`,
        amount,
        destination: RECIPIENT,
        federationAddress: "alice.nova",
      },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const rendered = renderHook(
    () =>
      useSimulateTxData({
        publicKey: PAYER,
        destination: RECIPIENT,
        networkDetails: NETWORK,
        simParams: { type: "soroban", xdr: "" },
        isMainnet: false,
      }),
    { wrapper },
  );
  return { ...rendered, store };
};

const mockSimulation = (amount: bigint) => {
  const preparedTransaction = buildTransfer(amount);
  const simulate = jest
    .spyOn(ApiInternal, "simulateTokenTransfer")
    .mockResolvedValue({
      ok: true,
      response: {
        preparedTransaction,
        simulationResponse: {
          minResourceFee: "100",
        } as rpc.Api.SimulateTransactionSuccessResponse,
      },
    });
  return { simulate, preparedTransaction };
};

describe("Soran token amount validation before review", () => {
  beforeEach(() => {
    jest.spyOn(Soran, "verifySoranDestination").mockResolvedValue(undefined);
    jest.spyOn(AccountHelpers, "getBaseAccount").mockResolvedValue(RECIPIENT);
    jest.spyOn(MuxedAddress, "checkIsMuxedSupported").mockResolvedValue(false);
    mockScanTx.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockFetchBalances.mockReset();
    mockScanTx.mockReset();
  });

  it.each([
    { amount: "123", decimals: 0, units: BigInt("123") },
    { amount: "1.2345678", decimals: 7, units: BigInt("12345678") },
    { amount: "1,234.5678901", decimals: 7, units: BigInt("12345678901") },
    {
      amount: "9007199254740993",
      decimals: 0,
      units: BigInt("9007199254740993"),
    },
    {
      amount: "900719925.4740993",
      decimals: 7,
      units: BigInt("9007199254740993"),
    },
  ])(
    "accepts the exact $amount at $decimals decimals",
    async ({ amount, decimals, units }) => {
      const { simulate, preparedTransaction } = mockSimulation(units);
      const { result, store } = renderSimulation(amount, decimals);
      let response: SimulateResult | undefined;

      await act(async () => {
        response = await result.current.fetchData();
      });

      expect(simulate).toHaveBeenCalledTimes(1);
      expect(response).toMatchObject({
        ok: true,
        data: { transactionXdr: preparedTransaction },
      });
      expect(result.current.state.state).toBe(RequestState.SUCCESS);
      expect(mockScanTx).toHaveBeenCalledWith(
        preparedTransaction,
        "internal",
        NETWORK,
      );
      expect(
        store.getState().transactionSubmission.transactionSimulation
          .preparedTransaction,
      ).toBe(preparedTransaction);
    },
  );

  it.each([
    {
      change: "smaller",
      amount: "1.2345678",
      decimals: 7,
      units: BigInt("12345677"),
    },
    {
      change: "larger",
      amount: "1.2345678",
      decimals: 7,
      units: BigInt("12345679"),
    },
    {
      change: "rounded above 2^53",
      amount: "9007199254740993",
      decimals: 0,
      units: BigInt("9007199254740992"),
    },
    {
      change: "rounded above 2^53",
      amount: "900719925.4740993",
      decimals: 7,
      units: BigInt("9007199254740992"),
    },
  ])(
    "rejects a $change response for $amount at $decimals decimals",
    async ({ amount, decimals, units }) => {
      const { simulate } = mockSimulation(units);
      const { result, store } = renderSimulation(amount, decimals);
      let response: SimulateResult | undefined;

      await act(async () => {
        response = await result.current.fetchData();
      });

      expect(simulate).toHaveBeenCalledTimes(1);
      expect(response).toMatchObject({ ok: false });
      expect(result.current.state).toMatchObject({
        state: RequestState.ERROR,
        data: null,
      });
      expect(mockScanTx).not.toHaveBeenCalled();
      expect(
        store.getState().transactionSubmission.transactionSimulation
          .preparedTransaction,
      ).toBeNull();
    },
  );

  it.each([
    { amount: "1.1", decimals: 0 },
    { amount: "1.00000001", decimals: 7 },
  ])(
    "rejects $amount beyond $decimals decimals before simulation",
    async ({ amount, decimals }) => {
      const { simulate } = mockSimulation(BigInt(1));
      const { result, store } = renderSimulation(amount, decimals);
      let response: SimulateResult | undefined;

      await act(async () => {
        response = await result.current.fetchData();
      });

      expect(simulate).not.toHaveBeenCalled();
      expect(response).toMatchObject({ ok: false });
      expect(result.current.state).toMatchObject({
        state: RequestState.ERROR,
        data: null,
      });
      expect(mockScanTx).not.toHaveBeenCalled();
      expect(
        store.getState().transactionSubmission.transactionSimulation
          .preparedTransaction,
      ).toBeNull();
    },
  );
});
