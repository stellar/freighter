import { Asset, Networks } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import { HistoryItemOperation } from "popup/components/accountHistory/HistoryItem";
import * as sorobanHelpers from "popup/helpers/soroban";
import { AssetType } from "@shared/api/types/account-balance";
import { getHistoryCounterparty } from "popup/helpers/soranHistory";
import { getRowDataByOpType, CollectibleLookupMap } from "../useGetHistoryData";

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

  it.each([
    { from: COUNTERPARTY, to: PUBLIC_KEY, isReceiving: true },
    { from: PUBLIC_KEY, to: COUNTERPARTY, isReceiving: false },
  ])(
    "preserves the sender and direction: %j",
    async ({ from, to, isReceiving }) => {
      jest
        .spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp")
        .mockReturnValue({
          fnName: SorobanTokenInterface.transfer,
          contractId: CONTRACT_ID,
          from,
          to,
          tokenId: 1,
        });
      const collectibles: CollectibleLookupMap = new Map([
        [
          `${CONTRACT_ID}:1`,
          {
            collectionAddress: CONTRACT_ID,
            collectionName: "Test collection",
            tokenId: "1",
            owner: to,
            tokenUri: "",
            metadata: null,
          },
        ],
      ]);
      const row = await callGetRowData(
        buildInvokeHostFnOperation(),
        [],
        collectibles,
      );
      expect(row.metadata).toMatchObject({
        isCollectibleTransfer: true,
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
});
