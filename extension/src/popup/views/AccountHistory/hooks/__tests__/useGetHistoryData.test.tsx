import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import { HistoryItemOperation } from "popup/components/accountHistory/HistoryItem";
import * as sorobanHelpers from "popup/helpers/soroban";
import { AssetType } from "@shared/api/types/account-balance";
import { getRowDataByOpType } from "../useGetHistoryData";

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
) =>
  getRowDataByOpType(
    PUBLIC_KEY,
    balances,
    operation,
    TESTNET_NETWORK_DETAILS,
    {},
    fetchTokenDetails,
    {},
    new Map(),
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

  it("treats a self-transfer (own base G... -> own muxed M...) as a debit, not a credit", async () => {
    jest
      .spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp")
      .mockReturnValue(null as any);

    const operation = buildInvokeHostFnOperation({
      asset_balance_changes: [
        {
          asset_type: "native",
          from: PUBLIC_KEY,
          to: MY_MUXED,
          amount: "5",
        },
      ],
    });

    const row = await callGetRowData(operation);

    // Both ends resolve to this wallet, so it is a self-transfer and must stay
    // Sent (debit) - matching the classic payment and Soroban transfer paths.
    expect(row.metadata.isReceiving).toBe(false);
    expect(row.amount).toMatch(/^-/);
  });
});
