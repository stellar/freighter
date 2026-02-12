import { SERVICE_TYPES } from "@shared/constants/services";
import {
  TransactionQueue,
  ResponseQueue,
  SignTransactionResponse,
  SignTransactionMessage,
} from "@shared/api/types/message-request";
import { signTransaction } from "../handlers/signTransaction";

const MOCK_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const MOCK_SECRET = "SCZANGBA5YHTNYVVV3C7CAZMCLXPILHSE6PGYIGE2QHKDXUSUONTLHSK";

const mockSign = jest.fn();
const mockToXDR = jest.fn().mockReturnValue("signed-xdr");

jest.mock("background/helpers/session", () => ({
  getEncryptedTemporaryData: jest.fn(),
}));

jest.mock("background/helpers/account", () => ({
  getNetworkDetails: jest.fn().mockResolvedValue({
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
}));

jest.mock("@shared/helpers/stellar", () => ({
  getSdk: jest.fn().mockReturnValue({
    Keypair: {
      fromSecret: () => ({
        publicKey: () =>
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        sign: jest.fn(),
      }),
    },
  }),
}));

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const mockLocalStore = {
  getItem: jest.fn().mockResolvedValue("mock-key-id"),
  setItem: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
} as any;

const mockSessionStore = {} as any;

describe("signTransaction handler", () => {
  let transactionQueue: TransactionQueue;
  let responseQueue: ResponseQueue<SignTransactionResponse>;
  let mockResponseFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionQueue = [];
    responseQueue = [];
    mockResponseFn = jest.fn();

    const sessionModule = require("background/helpers/session");
    sessionModule.getEncryptedTemporaryData.mockResolvedValue(MOCK_SECRET);
  });

  it("finds the correct transaction by uuid and signs it", async () => {
    const mockTransaction = {
      sign: mockSign,
      toXDR: mockToXDR,
    } as any;

    transactionQueue.push(
      {
        transaction: { sign: jest.fn(), toXDR: jest.fn() } as any,
        uuid: "uuid-1",
      },
      { transaction: mockTransaction, uuid: "uuid-2" },
      {
        transaction: { sign: jest.fn(), toXDR: jest.fn() } as any,
        uuid: "uuid-3",
      },
    );
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-2" });

    const request: SignTransactionMessage = {
      type: SERVICE_TYPES.SIGN_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-2",
    };

    await signTransaction({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      transactionQueue,
      responseQueue,
    });

    expect(mockSign).toHaveBeenCalled();
    expect(mockToXDR).toHaveBeenCalled();
    expect(transactionQueue).toHaveLength(2);
    expect(transactionQueue.map((t) => t.uuid)).toEqual(["uuid-1", "uuid-3"]);
    expect(mockResponseFn).toHaveBeenCalledWith("signed-xdr", MOCK_PUBLIC_KEY);
  });

  it("does not sign when uuid is not found in queue", async () => {
    const mockTransaction = {
      sign: mockSign,
      toXDR: mockToXDR,
    } as any;

    transactionQueue.push({ transaction: mockTransaction, uuid: "uuid-1" });
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request: SignTransactionMessage = {
      type: SERVICE_TYPES.SIGN_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "non-existent-uuid",
    };

    await signTransaction({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      transactionQueue,
      responseQueue,
    });

    expect(mockSign).not.toHaveBeenCalled();
    expect(mockToXDR).not.toHaveBeenCalled();
    expect(transactionQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
    expect(responseQueue).toHaveLength(1);
  });

  it("returns error when uuid is undefined", async () => {
    const mockTransaction = {
      sign: mockSign,
      toXDR: mockToXDR,
    } as any;

    transactionQueue.push({ transaction: mockTransaction, uuid: "uuid-1" });
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request = {
      type: SERVICE_TYPES.SIGN_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
    } as SignTransactionMessage;

    const result = await signTransaction({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      transactionQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Missing uuid" });
    expect(mockSign).not.toHaveBeenCalled();
    expect(transactionQueue).toHaveLength(1);
  });

  it("removes only the matched item from a multi-item queue", async () => {
    const tx1 = {
      sign: jest.fn(),
      toXDR: jest.fn().mockReturnValue("xdr-1"),
    } as any;
    const tx2 = {
      sign: jest.fn(),
      toXDR: jest.fn().mockReturnValue("xdr-2"),
    } as any;
    const tx3 = {
      sign: jest.fn(),
      toXDR: jest.fn().mockReturnValue("xdr-3"),
    } as any;

    transactionQueue.push(
      { transaction: tx1, uuid: "aaa" },
      { transaction: tx2, uuid: "bbb" },
      { transaction: tx3, uuid: "ccc" },
    );
    responseQueue.push({ response: mockResponseFn, uuid: "bbb" });

    const request: SignTransactionMessage = {
      type: SERVICE_TYPES.SIGN_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "bbb",
    };

    await signTransaction({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      transactionQueue,
      responseQueue,
    });

    expect(tx2.sign).toHaveBeenCalled();
    expect(tx1.sign).not.toHaveBeenCalled();
    expect(tx3.sign).not.toHaveBeenCalled();
    expect(transactionQueue).toHaveLength(2);
    expect(transactionQueue[0].uuid).toBe("aaa");
    expect(transactionQueue[1].uuid).toBe("ccc");
  });

  it("returns session timeout error when no private key", async () => {
    const sessionModule = require("background/helpers/session");
    sessionModule.getEncryptedTemporaryData.mockResolvedValueOnce("");

    const request: SignTransactionMessage = {
      type: SERVICE_TYPES.SIGN_TRANSACTION,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    const result = await signTransaction({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      transactionQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Session timed out" });
  });
});
