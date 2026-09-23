import React from "react";
import { Provider } from "react-redux";
import { act, renderHook } from "@testing-library/react";
import BigNumber from "bignumber.js";
import {
  Account,
  Address,
  Contract,
  Keypair,
  MuxedAccount,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "stellar-sdk";

import * as ApiInternal from "@shared/api/internal";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import * as MuxedAddress from "helpers/muxedAddress";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  initialState as submissionInitialState,
  saveAmount,
  saveCollectibleData,
  saveFederationAddress,
  saveMemoAndType,
} from "popup/ducks/transactionSubmission";
import { useSimulateTxData as useCollectibleSimulation } from "popup/components/sendCollectible/SelectedCollectible/hooks/useSimulateTxData";
import * as AccountHelpers from "popup/helpers/account";
import * as Soran from "popup/helpers/soran";
import i18n from "popup/helpers/localizationConfig";
import portugueseTranslations from "popup/locales/pt/translation.json";
import { FederationMemoType } from "popup/helpers/federationMemo";
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

const buildTransfer = (amount: bigint, fee = "200", destination = RECIPIENT) =>
  new TransactionBuilder(new Account(PAYER, "0"), {
    fee,
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      new Contract(CONTRACT).call(
        "transfer",
        new Address(PAYER).toScVal(),
        new Address(destination).toScVal(),
        nativeToScVal(amount, { type: "i128" }),
      ),
    )
    .setTimeout(0)
    .build()
    .toXDR();

const buildCollectibleTransfer = (tokenId: number, fee = "200") =>
  new TransactionBuilder(new Account(PAYER, "0"), {
    fee,
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      new Contract(CONTRACT).call(
        "transfer",
        new Address(PAYER).toScVal(),
        new Address(RECIPIENT).toScVal(),
        nativeToScVal(tokenId, { type: "u32" }),
      ),
    )
    .setTimeout(0)
    .build()
    .toXDR();

const renderSimulation = (
  amount: string,
  decimals: number,
  destination = RECIPIENT,
  isCollectible = false,
) => {
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
        destination,
        federationAddress: "alice.nova",
        isCollectible,
        collectibleData: {
          ...submissionInitialState.transactionData.collectibleData,
          collectionAddress: CONTRACT,
          tokenId: 1,
        },
      },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const useSimulation = isCollectible
    ? useCollectibleSimulation
    : useSimulateTxData;
  const rendered = renderHook(
    (props) =>
      useSimulation({
        ...props,
        simParams: { type: "soroban", xdr: "" },
        isMainnet: false,
      }),
    {
      wrapper,
      initialProps: { publicKey: PAYER, destination, networkDetails: NETWORK },
    },
  );
  return { ...rendered, store };
};

const mockSimulation = (amount: bigint, destination = RECIPIENT) => {
  const preparedTransaction = buildTransfer(amount, "200", destination);
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
      expect(simulate).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ amount: units.toString() }),
        }),
      );
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

describe("Soran simulation through the API boundary", () => {
  beforeEach(() => {
    jest.spyOn(Soran, "verifySoranDestination").mockResolvedValue(undefined);
    jest.spyOn(AccountHelpers, "getBaseAccount").mockResolvedValue(RECIPIENT);
    jest
      .spyOn(rpc.Server.prototype, "getAccount")
      .mockImplementation(async () => new Account(PAYER, "0"));
    mockScanTx.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockFetchBalances.mockReset();
    mockScanTx.mockReset();
  });

  it.each([
    { amount: "9007199254740993", decimals: 0, altered: false },
    { amount: "900719925.4740993", decimals: 7, altered: false },
    { amount: "9007199254740993", decimals: 0, altered: true },
    { amount: "900719925.4740993", decimals: 7, altered: true },
  ])(
    "preserves $amount through XDR and rejects altered responses ($altered)",
    async ({ amount, decimals, altered }) => {
      jest
        .spyOn(MuxedAddress, "checkIsMuxedSupported")
        .mockResolvedValue(false);
      let postedUnits: bigint | undefined;
      const fetch = jest
        .spyOn(global, "fetch")
        .mockImplementation(async (_url, options) => {
          const body = JSON.parse(options?.body as string);
          const transaction = TransactionBuilder.fromXDR(
            body.xdr,
            body.network_passphrase,
          );
          const operation = transaction.operations[0];
          if (
            operation.type !== "invokeHostFunction" ||
            operation.func.type !== "hostFunctionTypeInvokeContract"
          )
            throw new Error("Expected a contract transfer");
          postedUnits = scValToNative(operation.func.invokeContract.args[2]);
          return {
            ok: true,
            json: async () => ({
              preparedTransaction: buildTransfer(
                postedUnits! + (altered ? BigInt(1) : BigInt(0)),
              ),
              simulationResponse: { minResourceFee: "100" },
            }),
          } as Response;
        });
      const { result, store } = renderSimulation(amount, decimals);
      let response: SimulateResult | undefined;
      await act(async () => {
        response = await result.current.fetchData();
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/simulate-tx"),
        expect.any(Object),
      );
      expect(postedUnits).toBe(BigInt("9007199254740993"));
      expect(response).toMatchObject({ ok: !altered });
      if (altered) {
        expect(mockScanTx).not.toHaveBeenCalled();
        expect(result.current.state.data).toBeNull();
        expect(
          store.getState().transactionSubmission.transactionSimulation
            .preparedTransaction,
        ).toBeNull();
      } else {
        expect(result.current.state.state).toBe(RequestState.SUCCESS);
        expect(mockScanTx).toHaveBeenCalledTimes(1);
      }
    },
  );

  it.each([RECIPIENT, CONTRACT])(
    "preserves an ordinary recipient %s when the mux-capability lookup fails",
    async (destination) => {
      const spec = jest
        .spyOn(ApiInternal, "getContractSpec")
        .mockRejectedValue(new Error("Temporary capability lookup failure"));
      const { simulate } = mockSimulation(BigInt(10000000), destination);
      const { result } = renderSimulation("1", 7, destination);
      await act(async () => {
        expect(await result.current.fetchData()).toMatchObject({ ok: true });
      });
      expect(spec).toHaveBeenCalledTimes(1);
      expect(simulate).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ destination }),
        }),
      );
      expect(result.current.state.state).toBe(RequestState.SUCCESS);
    },
  );
});

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Value>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

describe("Soran simulation request freshness", () => {
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

  const response = (units: bigint) => ({
    ok: true,
    response: {
      preparedTransaction: buildTransfer(units),
      simulationResponse: {
        minResourceFee: "100",
      } as rpc.Api.SimulateTransactionSuccessResponse,
    },
  });

  it.each(["amount", "payer", "destination", "network", "unmount"])(
    "discards a prepared transaction after changing %s",
    async (change) => {
      const pending = deferred<ReturnType<typeof response>>();
      jest
        .spyOn(ApiInternal, "simulateTokenTransfer")
        .mockReturnValue(pending.promise);
      const { result, store, rerender, unmount } = renderSimulation("1", 7);
      let request!: Promise<SimulateResult>;
      await act(async () => {
        request = result.current.fetchData();
      });
      expect(ApiInternal.simulateTokenTransfer).toHaveBeenCalledTimes(1);
      act(() => {
        if (change === "amount") store.dispatch(saveAmount("2"));
        else if (change === "unmount") unmount();
        else
          rerender({
            publicKey: change === "payer" ? RECIPIENT : PAYER,
            destination: change === "destination" ? PAYER : RECIPIENT,
            networkDetails:
              change === "network"
                ? { ...NETWORK, sorobanRpcUrl: "https://other.example/rpc" }
                : NETWORK,
          });
      });
      await act(async () => {
        pending.resolve(response(BigInt(10000000)));
        expect(await request).toMatchObject({ ok: false });
      });
      expect(mockScanTx).not.toHaveBeenCalled();
      expect(
        store.getState().transactionSubmission.transactionSimulation
          .preparedTransaction,
      ).toBeNull();
      if (change !== "unmount") expect(result.current.state.data).toBeNull();
    },
  );

  it("does not save or expose a response changed while scanning", async () => {
    mockSimulation(BigInt(10000000));
    const scan = deferred<null>();
    mockScanTx.mockReturnValue(scan.promise);
    const { result, store } = renderSimulation("1", 7);
    let request!: Promise<SimulateResult>;
    await act(async () => {
      request = result.current.fetchData();
    });
    expect(mockScanTx).toHaveBeenCalledTimes(1);
    expect(
      store.getState().transactionSubmission.transactionSimulation
        .preparedTransaction,
    ).toBeNull();
    act(() => {
      store.dispatch(saveAmount("2"));
    });
    await act(async () => {
      scan.resolve(null);
      expect(await request).toMatchObject({ ok: false });
    });
    expect(result.current.state.data).toBeNull();
    expect(
      store.getState().transactionSubmission.transactionSimulation
        .preparedTransaction,
    ).toBeNull();
  });

  it.each([false, true])(
    "preserves a newer simulation when an older request finishes (error: %s)",
    async (fails) => {
      const older = deferred<ReturnType<typeof response>>();
      jest
        .spyOn(ApiInternal, "simulateTokenTransfer")
        .mockReturnValueOnce(older.promise)
        .mockResolvedValueOnce(response(BigInt(20000000)));
      const { result, store } = renderSimulation("1", 7);
      let first!: Promise<SimulateResult>;
      await act(async () => {
        first = result.current.fetchData();
      });
      act(() => {
        store.dispatch(saveAmount("2"));
      });
      await act(async () => {
        expect(await result.current.fetchData()).toMatchObject({ ok: true });
      });
      const latest = result.current.state.data;
      const saved =
        store.getState().transactionSubmission.transactionSimulation;
      await act(async () => {
        if (fails) older.reject(new Error("untrusted stale error"));
        else older.resolve(response(BigInt(10000000)));
        expect(await first).toMatchObject({ ok: false });
      });
      expect(result.current.state.data).toEqual(latest);
      expect(
        store.getState().transactionSubmission.transactionSimulation,
      ).toEqual(saved);
    },
  );

  it("hides an accepted review when its amount changes", async () => {
    mockSimulation(BigInt(10000000));
    const { result, store } = renderSimulation("1", 7);
    await act(async () => {
      await result.current.fetchData();
    });
    expect(result.current.state.state).toBe(RequestState.SUCCESS);
    act(() => {
      store.dispatch(saveAmount("2"));
    });
    expect(result.current.state.data).toBeNull();
  });

  it("prevents an older direct-address simulation from overwriting a Soran review", async () => {
    const older = deferred<ReturnType<typeof response>>();
    jest
      .spyOn(ApiInternal, "simulateTokenTransfer")
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(response(BigInt(20000000)));
    const { result, store } = renderSimulation("1", 7);
    act(() => {
      store.dispatch(saveFederationAddress(""));
    });
    let first!: Promise<SimulateResult>;
    await act(async () => {
      first = result.current.fetchData();
    });
    act(() => {
      store.dispatch(saveAmount("2"));
      store.dispatch(saveFederationAddress("alice.nova"));
    });
    await act(async () => {
      expect(await result.current.fetchData()).toMatchObject({ ok: true });
    });
    const latest = result.current.state.data;
    const saved = store.getState().transactionSubmission.transactionSimulation;
    await act(async () => {
      older.resolve(response(BigInt(10000000)));
      expect(await first).toMatchObject({ ok: false });
    });
    expect(result.current.state.data).toEqual(latest);
    expect(
      store.getState().transactionSubmission.transactionSimulation,
    ).toEqual(saved);
  });

  it("discards a collectible simulation after selecting another token ID", async () => {
    const transaction = buildCollectibleTransfer(1);
    const pending = deferred<ReturnType<typeof response>>();
    jest
      .spyOn(ApiInternal, "simulateSendCollectible")
      .mockReturnValue(pending.promise);
    const { result, store } = renderSimulation("1", 7, RECIPIENT, true);
    let request!: Promise<SimulateResult>;
    await act(async () => {
      request = result.current.fetchData();
    });
    act(() => {
      store.dispatch(
        saveCollectibleData({
          ...store.getState().transactionSubmission.transactionData
            .collectibleData,
          tokenId: 2,
        }),
      );
    });
    await act(async () => {
      pending.resolve({
        ...response(BigInt(1)),
        response: {
          ...response(BigInt(1)).response,
          preparedTransaction: transaction,
        },
      });
      expect(await request).toMatchObject({ ok: false });
    });
    expect(mockScanTx).not.toHaveBeenCalled();
    expect(result.current.state.data).toBeNull();
    expect(
      store.getState().transactionSubmission.transactionSimulation
        .preparedTransaction,
    ).toBeNull();
  });

  describe.each([false, true])("collectible: %s", (isCollectible) => {
    it.each(["100", "200", "300"])(
      "checks the prepared fee %s against the reviewed fee",
      async (fee) => {
        const preparedTransaction = isCollectible
          ? buildCollectibleTransfer(1, fee)
          : buildTransfer(BigInt(10000000), fee);
        jest
          .spyOn(
            ApiInternal,
            isCollectible ? "simulateSendCollectible" : "simulateTokenTransfer",
          )
          .mockResolvedValue({
            ...response(BigInt(10000000)),
            response: {
              ...response(BigInt(10000000)).response,
              preparedTransaction,
            },
          });
        const { result, store } = renderSimulation(
          "1",
          7,
          RECIPIENT,
          isCollectible,
        );
        await act(async () => {
          expect(await result.current.fetchData()).toMatchObject({
            ok: fee === "200",
          });
        });
        if (fee === "200") {
          expect(mockScanTx).toHaveBeenCalledTimes(1);
          expect(
            store.getState().transactionSubmission.transactionSimulation
              .preparedTransaction,
          ).toBe(preparedTransaction);
        } else {
          expect(mockScanTx).not.toHaveBeenCalled();
          expect(result.current.state.data).toBeNull();
          expect(
            store.getState().transactionSubmission.transactionSimulation
              .preparedTransaction,
          ).toBeNull();
        }
      },
    );
  });
});

it("shows the Portuguese Soran error for an unsupported muxed token recipient", async () => {
  const locale = jest
    .requireActual<typeof import("i18next")>("i18next")
    .createInstance();
  await locale.init({
    lng: "pt-BR",
    resources: { pt: { translation: portugueseTranslations } },
  });
  jest.spyOn(i18n, "t").mockImplementation(locale.t);
  jest.spyOn(Soran, "verifySoranDestination").mockResolvedValue(undefined);
  jest.spyOn(AccountHelpers, "getBaseAccount").mockResolvedValue(RECIPIENT);
  jest.spyOn(MuxedAddress, "checkIsMuxedSupported").mockResolvedValue(false);
  const { simulate } = mockSimulation(BigInt(10000000));
  const muxed = new MuxedAccount(new Account(RECIPIENT, "0"), "42").accountId();
  const { result, store } = renderSimulation("1", 7, muxed);
  try {
    let response: SimulateResult | undefined;
    await act(async () => {
      response = await result.current.fetchData();
    });
    const message =
      "Esta transferência não pode preservar o endereço muxed Soran. Escolha outro destinatário.";
    expect(response).toEqual({ ok: false, error: message });
    expect(result.current.state).toMatchObject({
      state: RequestState.ERROR,
      error: message,
    });
    expect(simulate).not.toHaveBeenCalled();
    expect(
      store.getState().transactionSubmission.transactionSimulation
        .preparedTransaction,
    ).toBeNull();
  } finally {
    jest.restoreAllMocks();
    mockFetchBalances.mockReset();
    mockScanTx.mockReset();
  }
});

it("shows the Portuguese Soran error when a token cannot preserve the required memo", async () => {
  const locale = jest
    .requireActual<typeof import("i18next")>("i18next")
    .createInstance();
  await locale.init({
    lng: "pt-BR",
    resources: { pt: { translation: portugueseTranslations } },
  });
  jest.spyOn(i18n, "t").mockImplementation(locale.t);
  jest.spyOn(Soran, "verifySoranDestination").mockResolvedValue(undefined);
  const { simulate } = mockSimulation(BigInt(10000000));
  const { result, store } = renderSimulation("1", 7);
  act(() => {
    store.dispatch(
      saveMemoAndType({ memo: "hello", memoType: FederationMemoType.Text }),
    );
  });
  try {
    await act(async () => {
      expect(await result.current.fetchData()).toEqual({
        ok: false,
        error:
          portugueseTranslations[
            "This token transfer cannot preserve the Soran memo"
          ],
      });
    });
    expect(simulate).not.toHaveBeenCalled();
    expect(result.current.state.data).toBeNull();
  } finally {
    jest.restoreAllMocks();
    mockFetchBalances.mockReset();
    mockScanTx.mockReset();
  }
});
