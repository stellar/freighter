/** Regression coverage for the Soran adversarial review.
 * All signing, RPC, submission, and storage use mocks; no wallet state is changed.
 */
import React from "react";
import browser from "webextension-polyfill";
import { ActionStatus } from "@shared/api/types";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import {
  Account,
  Address,
  Asset,
  Keypair,
  MuxedAccount,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  rpc,
} from "stellar-sdk";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { getOperation } from "popup/components/send/SendAmount/hooks/useSimulateTxData";
import { useSimulateTxData as useCollectibleSimulation } from "popup/components/sendCollectible/SelectedCollectible/hooks/useSimulateTxData";
import { useSubmitTxData } from "popup/components/InternalTransaction/SubmitTransaction/hooks/useSubmitTxData";
import { initialState as submissionInitialState } from "popup/ducks/transactionSubmission";
import { makeDummyStore } from "popup/__testHelpers__";
import * as api from "@shared/api/internal";
import * as soran from "popup/helpers/soran";

jest.mock("webextension-polyfill", () => ({
  __esModule: true,
  default: {
    runtime: {
      id: "trusted",
      getURL: (path: string) => `chrome-extension://trusted/${path}`,
    },
  },
}));

jest.mock("popup/helpers/blockaid", () => ({
  useScanTx: () => ({ scanTx: jest.fn().mockResolvedValue({}) }),
}));
jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));
jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({
    fetchData: jest.fn().mockResolvedValue({ balances: [] }),
  }),
}));
jest.mock("helpers/hooks/useGetCollectibles", () => ({
  useGetCollectibles: () => ({ fetchData: jest.fn().mockResolvedValue({}) }),
}));

const payer = Keypair.random().publicKey();
const recipient = Keypair.random().publicKey();
const wrongRecipient = Keypair.random().publicKey();
const muxed = new MuxedAccount(
  new Account(recipient, "0"),
  "18446744073709551615",
).accountId();
const network = TESTNET_NETWORK_DETAILS;
const buildPayment = (destination: string) =>
  new TransactionBuilder(new Account(payer, "0"), {
    fee: "100",
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      Operation.payment({ destination, asset: Asset.native(), amount: "10" }),
    )
    .setTimeout(0)
    .build()
    .toXDR();
const mockLookup = (address: string) => {
  const symbol = (tag: string) => nativeToScVal(tag, { type: "symbol" });
  let destination;
  if (address.startsWith("M")) {
    const route = MuxedAccount.fromAddress(address, "0");
    destination = nativeToScVal([
      symbol("Muxed"),
      nativeToScVal(
        {
          account: new Address(route.baseAccount().accountId()).toScVal(),
          id: nativeToScVal(BigInt(route.id()), { type: "u64" }),
        },
        { type: { account: ["symbol", null], id: ["symbol", null] } },
      ),
    ]);
  } else {
    destination = nativeToScVal([
      symbol("Direct"),
      nativeToScVal(
        {
          address: new Address(address).toScVal(),
          memo: nativeToScVal([symbol("None")]),
        },
        { type: { address: ["symbol", null], memo: ["symbol", null] } },
      ),
    ]);
  }
  jest
    .spyOn(rpc.Server.prototype, "simulateTransaction")
    .mockImplementation(async (tx) => {
      const op = tx.operations[0] as any;
      const method = op.func.invokeContract.functionName.toString();
      const retval =
        method === "registry"
          ? new Address(
              "CCSORANDPQINYOYB5SVO45WJP2LBBYKC72HHUIRVXB4J6RUZKDAUW7G4",
            ).toScVal()
          : method === "resolve_destination"
            ? destination
            : nativeToScVal(2, { type: "u32" });
      return {
        id: "read",
        latestLedger: 1,
        events: [],
        transactionData: {},
        minResourceFee: "0",
        result: { retval, auth: [] },
      } as any;
    });
};
const state = (destination: string, extra = {}) => ({
  auth: {
    publicKey: payer,
    allAccounts: [
      { publicKey: destination, name: "skip-recents", imported: false },
    ],
  },
  cache: { balanceData: {}, tokenPrices: {} },
  transactionSubmission: {
    ...submissionInitialState,
    transactionData: {
      ...submissionInitialState.transactionData,
      asset: "native",
      amount: "10",
      destination,
      federationAddress: "alice.nova",
      ...extra,
    },
  },
});
const wrapper =
  (store: ReturnType<typeof makeDummyStore>) =>
  ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
afterEach(() => jest.restoreAllMocks());

it.each([
  "https://unrelated.example/",
  "http://localhost:9000.evil.example/",
  "http://localhost:9000@evil.example/",
  "chrome-extension://other/index.html",
])("rejects history-label access from %s", async (url) => {
  const data: Record<string, unknown> = {};
  const localStore = {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      data[key] = value;
    }),
  } as any;
  const sessionStore = {
    getState: () => ({ session: { publicKey: payer } }),
  } as any;
  const payment = {
    networkPassphrase: network.networkPassphrase,
    transactionHash: "a".repeat(64),
    destination: recipient,
    memo: "hello",
    memoType: "text",
    name: "forged.nova",
  };
  const unrelatedPage = {
    tab: { id: 10 },
    id: "trusted",
    url,
  } as any;
  const invoke = (type: SERVICE_TYPES, payload: typeof payment) =>
    popupMessageListener(
      { type, activePublicKey: payer, payment: payload } as any,
      sessionStore,
      localStore,
      {} as any,
      {} as any,
      unrelatedPage,
    );
  expect(await invoke(SERVICE_TYPES.SAVE_SORAN_PAYMENT_NAME, payment)).toEqual({
    error: "Unauthorized",
  });
  expect(await invoke(SERVICE_TYPES.GET_SORAN_PAYMENT_NAME, payment)).toEqual({
    error: "Unauthorized",
  });
  expect(localStore.getItem).not.toHaveBeenCalled();
  expect(localStore.setItem).not.toHaveBeenCalled();
  // Control: another protected handler rejects exactly this sender.
  expect(
    await popupMessageListener(
      {
        type: SERVICE_TYPES.GET_ANALYTICS_USER_ID,
        activePublicKey: payer,
      } as any,
      sessionStore,
      localStore,
      {} as any,
      {} as any,
      unrelatedPage,
    ),
  ).toEqual({ error: "Unauthorized" });
});

it("rejects account creation that would drop a Soran muxed ID", async () => {
  mockLookup(muxed);
  expect(await soran.resolveSoranName("mux.nova", network)).toMatchObject({
    address: muxed,
    memo: "",
  });
  expect(() =>
    getOperation(
      Asset.native(),
      Asset.native(),
      "10",
      "",
      muxed,
      "1",
      [],
      false,
      false,
      false,
      payer,
      true,
    ),
  ).toThrow(/cannot preserve/);
});

it("rejects a collectible muxed route before requesting simulation", async () => {
  mockLookup(muxed);
  expect(await soran.resolveSoranName("mux.nova", network)).toMatchObject({
    address: muxed,
    memo: "",
  });
  const simulate = jest
    .spyOn(api, "simulateSendCollectible")
    .mockResolvedValue({
      ok: true,
      response: {
        simulationResponse: { minResourceFee: "100" },
        preparedTransaction: "mock-xdr",
      },
    } as any);
  const store = makeDummyStore(
    state(muxed, {
      isCollectible: true,
      collectibleData: {
        collectionAddress:
          "CCVKI6UYJDO34LO4D653IXCTPBGJOHJSJGSIOB4A46IH4ULNHS2MPQL7",
        tokenId: 42,
      },
    }),
  );
  const { result } = renderHook(
    () =>
      useCollectibleSimulation({
        publicKey: payer,
        destination: muxed,
        networkDetails: network,
      }),
    { wrapper: wrapper(store) },
  );
  let response: unknown;
  await act(async () => {
    response = await result.current.fetchData();
  });
  expect(response).toMatchObject({ ok: false });
  expect(simulate).not.toHaveBeenCalled();
});

it.each(["unsigned", "signed", "hardware"])(
  "blocks an altered recipient in the %s envelope",
  async (stage) => {
    const wrongXdr = buildPayment(wrongRecipient);
    mockLookup(recipient);
    jest.spyOn(soran, "verifySoranDestination");
    const sign = jest
      .spyOn(api, "signFreighterTransaction")
      .mockResolvedValue({ signedTransaction: wrongXdr });
    jest.spyOn(api, "getTokenPrices").mockResolvedValue({});
    jest.spyOn(api, "saveSoranPaymentName").mockResolvedValue({ saved: true });
    const priorFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ successful: true, hash: "b".repeat(64) }),
    });
    global.fetch = fetchMock as any;
    try {
      const initial = state(recipient);
      initial.transactionSubmission.transactionSimulation = {
        ...submissionInitialState.transactionSimulation,
        preparedTransaction: wrongXdr,
      };
      const store = makeDummyStore(initial);
      const { result } = renderHook(
        () =>
          useSubmitTxData({
            publicKey: payer,
            networkDetails: network,
            isHardwareWallet: stage === "hardware",
            xdr: stage === "signed" ? buildPayment(recipient) : wrongXdr,
          }),
        { wrapper: wrapper(store) },
      );
      await act(async () => {
        await result.current.fetchData({ isSwap: false });
      });
      expect(soran.verifySoranDestination).toHaveBeenCalledWith(
        "alice.nova",
        { address: recipient, memo: "", memoType: "" },
        network,
      );
      if (stage === "signed") expect(sign).toHaveBeenCalledTimes(1);
      else expect(sign).not.toHaveBeenCalled();
      expect(
        fetchMock.mock.calls.find(([url]) => String(url).includes("submit-tx")),
      ).toBeUndefined();
      expect(api.saveSoranPaymentName).not.toHaveBeenCalled();
      expect(store.getState().transactionSubmission.submitStatus).toBe(
        ActionStatus.ERROR,
      );
    } finally {
      global.fetch = priorFetch;
    }
  },
);

it.each(["popup", "fullscreen", "dev server"])(
  "allows saved-name access from the trusted %s",
  async (surface) => {
    const data: Record<string, unknown> = {};
    const localStore = {
      getItem: jest.fn(async (key: string) => data[key]),
      setItem: jest.fn(async (key: string, value: unknown) => {
        data[key] = value;
      }),
    } as any;
    const sessionStore = {
      getState: () => ({ session: { publicKey: payer } }),
    } as any;
    const getURL = jest
      .spyOn(browser.runtime, "getURL")
      .mockImplementation((path) => `chrome-extension://trusted/${path}`);
    try {
      const sender = {
        id: browser.runtime.id,
        ...(surface === "popup"
          ? {}
          : {
              tab: { id: 10 },
              url:
                surface === "fullscreen"
                  ? "chrome-extension://trusted/index.html"
                  : "http://localhost:9000/",
            }),
      };
      const payment = {
        name: "alice.nova",
        destination: recipient,
        transactionHash: "c".repeat(64),
        memo: "",
        memoType: "none",
        networkPassphrase: network.networkPassphrase,
      };
      const invoke = (type: SERVICE_TYPES) =>
        popupMessageListener(
          { type, activePublicKey: payer, payment } as any,
          sessionStore,
          localStore,
          {} as any,
          {} as any,
          sender as any,
        );
      expect(await invoke(SERVICE_TYPES.SAVE_SORAN_PAYMENT_NAME)).toEqual({
        saved: true,
      });
      expect(await invoke(SERVICE_TYPES.GET_SORAN_PAYMENT_NAME)).toEqual({
        name: "alice.nova",
      });
    } finally {
      getURL.mockRestore();
    }
  },
);
