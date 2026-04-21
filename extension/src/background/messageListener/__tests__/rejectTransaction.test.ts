import { SERVICE_TYPES } from "@shared/constants/services";
import {
  TransactionQueue,
  ResponseQueue,
  RejectTransactionResponse,
  RejectTransactionMessage,
} from "@shared/api/types/message-request";
import { rejectTransaction } from "../handlers/rejectTransaction";
import { captureException } from "@sentry/browser";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const MOCK_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

describe("rejectTransaction handler", () => {
  let transactionQueue: TransactionQueue;
  let responseQueue: ResponseQueue<RejectTransactionResponse>;
  let mockResponseFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionQueue = [];
    responseQueue = [];
    mockResponseFn = jest.fn();
  });

  it("finds the correct transaction by uuid and rejects it", () => {
    const mockTransaction1 = { sign: jest.fn(), toXDR: jest.fn() } as any;
    const mockTransaction2 = { sign: jest.fn(), toXDR: jest.fn() } as any;
    const mockTransaction3 = { sign: jest.fn(), toXDR: jest.fn() } as any;

    transactionQueue.push(
      { transaction: mockTransaction1, uuid: "uuid-1", createdAt: Date.now() },
      { transaction: mockTransaction2, uuid: "uuid-2", createdAt: Date.now() },
      { transaction: mockTransaction3, uuid: "uuid-3", createdAt: Date.now() },
    );
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-2",
      createdAt: Date.now(),
    });

    const request: RejectTransactionMessage = {
      type: SERVICE_TYPES.REJECT_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-2",
    };

    rejectTransaction({
      request,
      transactionQueue,
      responseQueue,
    });

    expect(transactionQueue).toHaveLength(2);
    expect(transactionQueue.map((t) => t.uuid)).toEqual(["uuid-1", "uuid-3"]);
    expect(responseQueue).toHaveLength(0);
    expect(mockResponseFn).toHaveBeenCalledWith(undefined);
  });

  it("removes transaction from queue when uuid is found but no response queue item", () => {
    const mockTransaction = { sign: jest.fn(), toXDR: jest.fn() } as any;

    transactionQueue.push({
      transaction: mockTransaction,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: RejectTransactionMessage = {
      type: SERVICE_TYPES.REJECT_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    rejectTransaction({
      request,
      transactionQueue,
      responseQueue,
    });

    expect(transactionQueue).toHaveLength(0);
    expect(responseQueue).toHaveLength(0);
    expect(captureException).toHaveBeenCalledWith(
      "rejectTransaction: no matching response found for uuid uuid-1",
    );
  });

  it("does not remove items when uuid is not found in queue", () => {
    const mockTransaction = { sign: jest.fn(), toXDR: jest.fn() } as any;

    transactionQueue.push({
      transaction: mockTransaction,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: RejectTransactionMessage = {
      type: SERVICE_TYPES.REJECT_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "non-existent-uuid",
    };

    rejectTransaction({
      request,
      transactionQueue,
      responseQueue,
    });

    expect(transactionQueue).toHaveLength(1);
    expect(responseQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
  });

  it("returns early and logs error when uuid is undefined", () => {
    const mockTransaction = { sign: jest.fn(), toXDR: jest.fn() } as any;

    transactionQueue.push({
      transaction: mockTransaction,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request = {
      type: SERVICE_TYPES.REJECT_TRANSACTION,
    } as RejectTransactionMessage;

    rejectTransaction({
      request,
      transactionQueue,
      responseQueue,
    });

    expect(captureException).toHaveBeenCalledWith(
      "rejectTransaction: missing uuid in request",
    );
    expect(transactionQueue).toHaveLength(1);
    expect(responseQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
  });

  it("removes only the matched item from a multi-item queue", () => {
    const tx1 = { sign: jest.fn(), toXDR: jest.fn() } as any;
    const tx2 = { sign: jest.fn(), toXDR: jest.fn() } as any;
    const tx3 = { sign: jest.fn(), toXDR: jest.fn() } as any;

    transactionQueue.push(
      { transaction: tx1, uuid: "aaa", createdAt: Date.now() },
      { transaction: tx2, uuid: "bbb", createdAt: Date.now() },
      { transaction: tx3, uuid: "ccc", createdAt: Date.now() },
    );
    responseQueue.push({
      response: mockResponseFn,
      uuid: "bbb",
      createdAt: Date.now(),
    });

    const request: RejectTransactionMessage = {
      type: SERVICE_TYPES.REJECT_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "bbb",
    };

    rejectTransaction({
      request,
      transactionQueue,
      responseQueue,
    });

    expect(transactionQueue).toHaveLength(2);
    expect(transactionQueue[0].uuid).toBe("aaa");
    expect(transactionQueue[1].uuid).toBe("ccc");
    expect(responseQueue).toHaveLength(0);
    expect(mockResponseFn).toHaveBeenCalledWith(undefined);
  });

  it("handles multiple response queue items correctly", () => {
    const mockTransaction = { sign: jest.fn(), toXDR: jest.fn() } as any;
    const mockResponseFn2 = jest.fn();

    transactionQueue.push({
      transaction: mockTransaction,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });
    responseQueue.push(
      { response: mockResponseFn, uuid: "uuid-2", createdAt: Date.now() },
      { response: mockResponseFn2, uuid: "uuid-1", createdAt: Date.now() },
    );

    const request: RejectTransactionMessage = {
      type: SERVICE_TYPES.REJECT_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    rejectTransaction({
      request,
      transactionQueue,
      responseQueue,
    });

    expect(transactionQueue).toHaveLength(0);
    expect(responseQueue).toHaveLength(1);
    expect(responseQueue[0].uuid).toBe("uuid-2");
    expect(mockResponseFn).not.toHaveBeenCalled();
    expect(mockResponseFn2).toHaveBeenCalledWith(undefined);
  });

  it("removes transaction even when response queue item is missing", () => {
    const mockTransaction1 = { sign: jest.fn(), toXDR: jest.fn() } as any;
    const mockTransaction2 = { sign: jest.fn(), toXDR: jest.fn() } as any;

    transactionQueue.push(
      { transaction: mockTransaction1, uuid: "uuid-1", createdAt: Date.now() },
      { transaction: mockTransaction2, uuid: "uuid-2", createdAt: Date.now() },
    );

    const request: RejectTransactionMessage = {
      type: SERVICE_TYPES.REJECT_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    rejectTransaction({
      request,
      transactionQueue,
      responseQueue,
    });

    expect(transactionQueue).toHaveLength(1);
    expect(transactionQueue[0].uuid).toBe("uuid-2");
    expect(captureException).toHaveBeenCalledWith(
      "rejectTransaction: no matching response found for uuid uuid-1",
    );
  });
});
