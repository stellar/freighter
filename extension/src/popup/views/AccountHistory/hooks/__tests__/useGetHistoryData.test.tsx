import {
  Account,
  Address,
  Asset,
  Contract,
  MuxedAccount,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
} from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import { HistoryItemOperation } from "popup/components/accountHistory/HistoryItem";
import * as sorobanHelpers from "popup/helpers/soroban";
import { AssetType } from "@shared/api/types/account-balance";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import { getHistoryCounterparty } from "popup/helpers/soranHistory";
import {
  getOperationDependencies,
  getRowDataByOpType,
  CollectibleLookupMap,
} from "../useGetHistoryData";

jest.mock("@shared/api/helpers/fetchCollectibles", () => ({
  fetchCollectibles: jest.fn(),
}));
jest.mock("popup/App", () => ({
  store: {
    getState: () => ({ cache: { collections: {} } }),
    dispatch: jest.fn(),
  },
}));

// Base account owned by the wallet and its muxed (M...) forms.
const PUBLIC_KEY = "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3";
const MY_MUXED =
  "MAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWUAAAAAAAAAAAAGPZI";
const COUNTERPARTY = "GBE5XHPAMKKVHJJB6CWOFXIIAWKEJ7SSUNUMYFISYR47HOKIJ6JRA43Y";

const fetchTokenDetails = jest.fn();

const buildPaymentOperation = ({
  to,
  toMuxed,
  from,
}: {
  to: string;
  toMuxed?: string;
  from: string;
}): HistoryItemOperation =>
  ({
    id: "op-1",
    type: "payment",
    type_i: 1,
    created_at: "2024-01-01T00:00:00Z",
    asset_type: "native",
    amount: "5",
    to,
    to_muxed: toMuxed,
    from,
    transaction_attr: {
      operation_count: 1,
      fee_charged: "100",
      memo: "",
      envelope_xdr: "",
    },
    isPayment: true,
    isSwap: false,
    isDustPayment: false,
    isCreateExternalAccount: false,
  }) as unknown as HistoryItemOperation;

const CONTRACT_ID = "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526";

const callGetRowData = (
  operation: HistoryItemOperation,
  balances: AssetType[] = [],
  collectibles: CollectibleLookupMap = new Map(),
) =>
  getRowDataByOpType(
    PUBLIC_KEY,
    balances,
    operation,
    TESTNET_NETWORK_DETAILS,
    {},
    fetchTokenDetails,
    {},
    collectibles,
    [],
  );

const buildInvokeHostFnOperation = (
  overrides: Record<string, unknown> = {},
): HistoryItemOperation =>
  ({
    id: "soroban-op-1",
    type: "invoke_host_function",
    type_i: 24,
    created_at: "2024-01-01T00:00:00Z",
    asset_balance_changes: null,
    transaction_attr: {
      operation_count: 1,
      fee_charged: "100",
      memo: "",
      envelope_xdr: "",
    },
    isPayment: false,
    isSwap: false,
    isDustPayment: false,
    isCreateExternalAccount: false,
    ...overrides,
  }) as unknown as HistoryItemOperation;

describe("getRowDataByOpType - classic payment muxed classification", () => {
  it("classifies a payment received to the wallet's MUXED address as Received", async () => {
    const operation = buildPaymentOperation({
      to: PUBLIC_KEY,
      toMuxed: MY_MUXED,
      from: COUNTERPARTY,
    });

    const row = await callGetRowData(operation);

    expect(row.action).toBe("Received");
    expect(row.actionIcon).toBe("received");
    expect(row.amount).toMatch(/^\+/);
    expect(row.metadata.isReceiving).toBe(true);
  });

  it("classifies a payment received to the wallet's base (G...) address as Received", async () => {
    const operation = buildPaymentOperation({
      to: PUBLIC_KEY,
      from: COUNTERPARTY,
    });

    const row = await callGetRowData(operation);

    expect(row.action).toBe("Received");
    expect(row.amount).toMatch(/^\+/);
  });

  it("classifies a payment sent to another account as Sent", async () => {
    const operation = buildPaymentOperation({
      to: COUNTERPARTY,
      from: PUBLIC_KEY,
    });

    const row = await callGetRowData(operation);

    expect(row.action).toBe("Sent");
    expect(row.actionIcon).toBe("sent");
    expect(row.amount).toMatch(/^-/);
  });

  it("treats a self-payment to the wallet's own muxed address as Sent", async () => {
    const operation = buildPaymentOperation({
      to: PUBLIC_KEY,
      toMuxed: MY_MUXED,
      from: PUBLIC_KEY,
    });

    const row = await callGetRowData(operation);

    expect(row.action).toBe("Sent");
  });
});

describe("account creation history naming", () => {
  it.each([
    { funder: COUNTERPARTY, account: PUBLIC_KEY, withOtherPayment: false },
    { funder: PUBLIC_KEY, account: COUNTERPARTY, withOtherPayment: false },
    { funder: COUNTERPARTY, account: PUBLIC_KEY, withOtherPayment: true },
    { funder: PUBLIC_KEY, account: COUNTERPARTY, withOtherPayment: true },
  ])(
    "uses the funder and account belonging to this operation: %j",
    async ({ funder, account, withOtherPayment }) => {
      const tx = new TransactionBuilder(new Account(funder, "0"), {
        networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
        fee: "100",
      });
      if (withOtherPayment) {
        tx.addOperation(
          Operation.payment({
            destination:
              "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            asset: Asset.native(),
            amount: "1",
          }),
        );
      }
      tx.addOperation(
        Operation.createAccount({ destination: account, startingBalance: "5" }),
      );
      const row = await callGetRowData({
        ...buildInvokeHostFnOperation(),
        type: "create_account",
        type_i: 0,
        account,
        funder,
        starting_balance: "5",
        isCreateExternalAccount: account !== PUBLIC_KEY,
        transaction_attr: {
          ...buildInvokeHostFnOperation().transaction_attr,
          operation_count: withOtherPayment ? 2 : 1,
          envelope_xdr: tx.setTimeout(0).build().toXDR(),
        },
      } as HistoryItemOperation);

      expect(row.metadata.to).toBe(account);
      expect(row.metadata.from).toBe(funder);
      expect(getHistoryCounterparty(row)).toEqual({
        address: COUNTERPARTY,
        isReceiving: account === PUBLIC_KEY,
      });
    },
  );
});

describe("getRowDataByOpType - Soroban token transfer muxed classification", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("classifies a Soroban token transfer received to the wallet's MUXED address as Received", async () => {
    jest.spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp").mockReturnValue({
      fnName: SorobanTokenInterface.transfer,
      contractId: CONTRACT_ID,
      from: COUNTERPARTY,
      to: MY_MUXED,
      amount: "100",
    } as any);
    fetchTokenDetails.mockResolvedValue({ symbol: "TEST", decimals: 7 });

    // asset_issuer as a contract id keeps icon resolution offline in tests
    const operation = buildInvokeHostFnOperation({ asset_issuer: CONTRACT_ID });
    const row = await callGetRowData(operation);

    expect(row.action).toBe("Received");
    expect(row.actionIcon).toBe("received");
    expect(row.amount).toMatch(/^\+/);
  });
});

describe("getRowDataByOpType - Soroban mint muxed classification", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("classifies a mint to the wallet's MUXED address as Received (not Minted)", async () => {
    jest.spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp").mockReturnValue({
      fnName: SorobanTokenInterface.mint,
      contractId: CONTRACT_ID,
      to: MY_MUXED,
      amount: "100",
    } as any);

    const balances = [
      {
        contractId: CONTRACT_ID,
        token: { code: "TEST" },
        decimals: 7,
      },
    ] as unknown as AssetType[];

    const operation = buildInvokeHostFnOperation();
    const row = await callGetRowData(operation, balances);

    expect(row.action).toBe("Received");
    expect(row.actionIcon).toBe("received");
    expect(row.amount).toMatch(/^\+/);
  });
});

describe("getRowDataByOpType - Soroban asset balance changes muxed classification", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("counts a balance change credited to the wallet's MUXED address as a credit", async () => {
    jest
      .spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp")
      .mockReturnValue(null as any);

    const operation = buildInvokeHostFnOperation({
      asset_balance_changes: [
        {
          asset_type: "native",
          from: COUNTERPARTY,
          to: MY_MUXED,
          amount: "5",
        },
      ],
    });

    const row = await callGetRowData(operation);

    expect(row.metadata.isReceiving).toBe(true);
    expect(row.amount).toMatch(/^\+/);
  });
});

const NON_NATIVE_CONTRACT =
  "CCV3NAKLIBBNSJNNTV2AZVRX6VODUDWK4TVYILE5MW6R45SSQJS5VCAM";

describe("getRowDataByOpType - Soroban transfer identity", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // A contract's symbol() is self-reported, so it cannot establish which asset
  // the contract is. Only the contract address can.
  it("does not label a contract as the native asset because it reports that symbol", async () => {
    jest.spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp").mockReturnValue({
      fnName: SorobanTokenInterface.transfer,
      contractId: NON_NATIVE_CONTRACT,
      amount: "10000000",
      from: COUNTERPARTY,
      to: PUBLIC_KEY,
    } as any);
    fetchTokenDetails.mockResolvedValue({ symbol: "native", decimals: 7 });

    // asset_issuer as a contract id keeps icon resolution offline in tests
    const operation = buildInvokeHostFnOperation({
      asset_issuer: NON_NATIVE_CONTRACT,
    });
    const row = await callGetRowData(operation);

    expect(row.amount).not.toContain("XLM");
  });

  it("labels the native contract as the native asset", async () => {
    const nativeContractId = Asset.native().contractId(
      TESTNET_NETWORK_DETAILS.networkPassphrase as Networks,
    );

    jest.spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp").mockReturnValue({
      fnName: SorobanTokenInterface.transfer,
      contractId: nativeContractId,
      amount: "10000000",
      from: COUNTERPARTY,
      to: PUBLIC_KEY,
    } as any);
    fetchTokenDetails.mockResolvedValue({ symbol: "native", decimals: 7 });

    // asset_issuer as a contract id keeps icon resolution offline in tests
    const operation = buildInvokeHostFnOperation({
      asset_issuer: nativeContractId,
    });
    const row = await callGetRowData(operation);

    expect(row.amount).toContain("XLM");
  });
});

it("preserves a muxed sender and transaction reference for history naming", async () => {
  const op = buildPaymentOperation({ to: PUBLIC_KEY, from: COUNTERPARTY });
  op.from_muxed = new (await import("stellar-sdk")).MuxedAccount(
    new (await import("stellar-sdk")).Account(COUNTERPARTY, "0"),
    "42",
  ).accountId();
  op.transaction_attr.hash = "a".repeat(64);
  op.transaction_attr.memo_type = "text";
  op.transaction_attr.memo = "hello";
  const row = await callGetRowData(op);
  expect(row.metadata).toMatchObject({
    from: op.from_muxed,
    transactionHash: "a".repeat(64),
    memoType: "text",
    memo: "hello",
    publicKey: PUBLIC_KEY,
  });
});

describe("collectible history naming", () => {
  afterEach(() => jest.restoreAllMocks());

  const collectibleOperation = (from: string, to: string, tokenId: number) => {
    const envelopeXdr = new TransactionBuilder(new Account(from, "0"), {
      networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
      fee: "100",
    })
      .addOperation(
        new Contract(CONTRACT_ID).call(
          SorobanTokenInterface.transfer,
          new Address(from).toScVal(),
          new Address(to).toScVal(),
          nativeToScVal(tokenId, { type: "u32" }),
        ),
      )
      .setTimeout(0)
      .build()
      .toXDR();
    return buildInvokeHostFnOperation({
      transaction_attr: {
        operation_count: 1,
        fee_charged: "100",
        memo: "",
        envelope_xdr: envelopeXdr,
      },
    });
  };
  const collectible = (owner: string, tokenId: number) => ({
    collectionAddress: CONTRACT_ID,
    collectionName: "Test collection",
    tokenId: tokenId.toString(),
    owner,
    tokenUri: "",
    metadata: null,
  });

  it.each([
    { from: COUNTERPARTY, to: PUBLIC_KEY, isReceiving: true, tokenId: 0 },
    { from: PUBLIC_KEY, to: COUNTERPARTY, isReceiving: false, tokenId: 0 },
    { from: COUNTERPARTY, to: PUBLIC_KEY, isReceiving: true, tokenId: 1 },
    { from: PUBLIC_KEY, to: COUNTERPARTY, isReceiving: false, tokenId: 1 },
  ])(
    "preserves the sender and direction: %j",
    async ({ from, to, isReceiving, tokenId }) => {
      const collectibles: CollectibleLookupMap = new Map([
        [`${CONTRACT_ID}:${tokenId}`, collectible(to, tokenId)],
      ]);
      const row = await callGetRowData(
        collectibleOperation(from, to, tokenId),
        [],
        collectibles,
      );
      expect(row.metadata).toMatchObject({
        isCollectibleTransfer: true,
        collectionTokenId: tokenId.toString(),
        from,
        to,
        isReceiving,
      });
      expect(getHistoryCounterparty(row)).toEqual({
        address: COUNTERPARTY,
        isReceiving,
      });
    },
  );

  it.each([
    { from: COUNTERPARTY, to: PUBLIC_KEY, isReceiving: true },
    { from: PUBLIC_KEY, to: COUNTERPARTY, isReceiving: false },
  ])(
    "fetches token zero through the batch dependency pipeline: %j",
    async ({ from, to, isReceiving }) => {
      const fetch = jest.mocked(fetchCollectibles);
      fetch.mockClear();
      fetch.mockResolvedValue([
        {
          collection: {
            address: CONTRACT_ID,
            name: "Test collection",
            symbol: "TEST",
            collectibles: [collectible(to, 0)],
          },
        },
      ]);
      const op = collectibleOperation(from, to, 0);
      const { collectibleLookup } = await getOperationDependencies(
        [op],
        TESTNET_NETWORK_DETAILS,
        PUBLIC_KEY,
        {},
      );
      expect(fetch).toHaveBeenCalledWith({
        publicKey: PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
        contracts: [{ id: CONTRACT_ID, token_ids: ["0"] }],
      });
      expect(collectibleLookup.get(`${CONTRACT_ID}:0`)).toEqual(
        collectible(to, 0),
      );
      const row = await callGetRowData(op, [], collectibleLookup);
      expect(row.amount).toBe("#0");
      expect(getHistoryCounterparty(row)).toEqual({
        address: COUNTERPARTY,
        isReceiving,
      });
    },
  );

  it("does not fetch or name a collectible without a token ID", async () => {
    jest.spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp").mockReturnValue({
      fnName: SorobanTokenInterface.transfer,
      contractId: CONTRACT_ID,
      from: COUNTERPARTY,
      to: PUBLIC_KEY,
    });
    jest.mocked(fetchCollectibles).mockClear();
    const op = buildInvokeHostFnOperation();
    const { collectibleLookup } = await getOperationDependencies(
      [op],
      TESTNET_NETWORK_DETAILS,
      PUBLIC_KEY,
      {},
    );
    expect(fetchCollectibles).not.toHaveBeenCalled();
    const row = await callGetRowData(op, [], collectibleLookup);
    expect(row.metadata.isCollectibleTransfer).toBeUndefined();
    expect(getHistoryCounterparty(row)).toBeUndefined();
  });
});

describe("token transfer history naming without asset balance changes", () => {
  afterEach(() => jest.restoreAllMocks());

  const muxedCounterparty = new MuxedAccount(
    new Account(COUNTERPARTY, "0"),
    "42",
  ).accountId();
  it.each([
    {
      from: COUNTERPARTY,
      to: PUBLIC_KEY,
      isReceiving: true,
      address: COUNTERPARTY,
    },
    {
      from: PUBLIC_KEY,
      to: COUNTERPARTY,
      isReceiving: false,
      address: COUNTERPARTY,
    },
    {
      from: muxedCounterparty,
      to: MY_MUXED,
      isReceiving: true,
      address: muxedCounterparty,
    },
    {
      from: PUBLIC_KEY,
      to: muxedCounterparty,
      isReceiving: false,
      address: muxedCounterparty,
    },
  ])(
    "preserves direction and complete counterparty: %j",
    async ({ from, to, isReceiving, address }) => {
      jest
        .spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp")
        .mockReturnValue({
          fnName: SorobanTokenInterface.transfer,
          contractId: CONTRACT_ID,
          from,
          to,
          amount: 10000000,
        });
      fetchTokenDetails.mockResolvedValue({ symbol: "TEST", decimals: 7 });
      const row = await callGetRowData(
        buildInvokeHostFnOperation({ asset_issuer: CONTRACT_ID }),
      );

      expect(row.action).toBe(isReceiving ? "Received" : "Sent");
      expect(row.metadata).toMatchObject({
        isTokenTransfer: true,
        from,
        to,
        isReceiving,
      });
      expect(getHistoryCounterparty(row)).toEqual({ address, isReceiving });
    },
  );
});
