import { SERVICE_TYPES } from "@shared/constants/services";
import {
  TokenQueue,
  TokenQueueItem,
  ResponseQueue,
  AddTokenResponse,
  AddTokenMessage,
} from "@shared/api/types/message-request";
import { addToken } from "../handlers/addToken";

const MOCK_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const MOCK_CONTRACT_ID =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

jest.mock("background/helpers/account", () => ({
  getNetworkDetails: jest.fn().mockResolvedValue({
    network: "TESTNET",
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
}));

jest.mock("../helpers/add-token-contract-id", () => ({
  addTokenWithContractId: jest.fn(),
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

const mockSessionStore = {
  getState: jest.fn().mockReturnValue({
    session: {
      publicKey: MOCK_PUBLIC_KEY,
    },
  }),
} as any;

const makeTokenQueueItem = (
  uuid: string,
  contractId: string = MOCK_CONTRACT_ID,
): TokenQueueItem => ({
  token: {
    domain: "example.com",
    url: "https://example.com",
    contractId,
    uuid,
  },
  uuid,
  createdAt: Date.now(),
});

describe("addToken handler", () => {
  let tokenQueue: TokenQueue;
  let responseQueue: ResponseQueue<AddTokenResponse>;
  let mockResponseFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenQueue = [];
    responseQueue = [];
    mockResponseFn = jest.fn();

    const addTokenModule = require("../helpers/add-token-contract-id");
    addTokenModule.addTokenWithContractId.mockResolvedValue({
      accountTokenIdList: [MOCK_CONTRACT_ID],
    });
  });

  it("finds the correct token by uuid and adds it", async () => {
    tokenQueue.push(
      makeTokenQueueItem("uuid-1"),
      makeTokenQueueItem("uuid-2"),
      makeTokenQueueItem("uuid-3"),
    );
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-2",
      createdAt: Date.now(),
    });

    const request: AddTokenMessage = {
      type: SERVICE_TYPES.ADD_TOKEN,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-2",
    };

    await addToken({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      tokenQueue,
      responseQueue,
    });

    expect(tokenQueue).toHaveLength(2);
    expect(tokenQueue.map((t) => t.uuid)).toEqual(["uuid-1", "uuid-3"]);
    expect(mockResponseFn).toHaveBeenCalledWith(true);
  });

  it("throws error when uuid is not found in queue", async () => {
    tokenQueue.push(makeTokenQueueItem("uuid-1"));
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: AddTokenMessage = {
      type: SERVICE_TYPES.ADD_TOKEN,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "non-existent-uuid",
    };

    await expect(
      addToken({
        request,
        localStore: mockLocalStore,
        sessionStore: mockSessionStore,
        tokenQueue,
        responseQueue,
      }),
    ).rejects.toThrow("Missing contract id");

    expect(tokenQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
  });

  it("returns error when uuid is undefined", async () => {
    tokenQueue.push(makeTokenQueueItem("uuid-1"));
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request = {
      type: SERVICE_TYPES.ADD_TOKEN,
    } as AddTokenMessage;

    const result = await addToken({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      tokenQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Transaction not found" });
    expect(tokenQueue).toHaveLength(1);
  });

  it("removes only the matched item from a multi-item queue", async () => {
    tokenQueue.push(
      makeTokenQueueItem("aaa"),
      makeTokenQueueItem("bbb"),
      makeTokenQueueItem("ccc"),
    );
    responseQueue.push({
      response: mockResponseFn,
      uuid: "bbb",
      createdAt: Date.now(),
    });

    const request: AddTokenMessage = {
      type: SERVICE_TYPES.ADD_TOKEN,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "bbb",
    };

    await addToken({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      tokenQueue,
      responseQueue,
    });

    expect(tokenQueue).toHaveLength(2);
    expect(tokenQueue[0].uuid).toBe("aaa");
    expect(tokenQueue[1].uuid).toBe("ccc");
  });

  it("throws error when contractId is missing", async () => {
    tokenQueue.push({
      token: {
        domain: "example.com",
        url: "https://example.com",
        contractId: "",
        uuid: "uuid-1",
      },
      uuid: "uuid-1",
      createdAt: Date.now(),
    });
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: AddTokenMessage = {
      type: SERVICE_TYPES.ADD_TOKEN,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    await expect(
      addToken({
        request,
        localStore: mockLocalStore,
        sessionStore: mockSessionStore,
        tokenQueue,
        responseQueue,
      }),
    ).rejects.toThrow("Missing contract id");
  });

  it("returns session timeout error when no publicKey", async () => {
    const mockSessionStoreNoPublicKey = {
      getState: jest.fn().mockReturnValue({
        session: {
          publicKey: "",
        },
      }),
    } as any;

    tokenQueue.push(makeTokenQueueItem("uuid-1"));
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: AddTokenMessage = {
      type: SERVICE_TYPES.ADD_TOKEN,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    const result = await addToken({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStoreNoPublicKey,
      tokenQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Session timed out" });
  });

  it("calls response with false when addTokenWithContractId returns error", async () => {
    const addTokenModule = require("../helpers/add-token-contract-id");
    addTokenModule.addTokenWithContractId.mockResolvedValueOnce({
      error: "Failed to subscribe to token details",
    });

    tokenQueue.push(makeTokenQueueItem("uuid-1"));
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: AddTokenMessage = {
      type: SERVICE_TYPES.ADD_TOKEN,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    await addToken({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      tokenQueue,
      responseQueue,
    });

    expect(mockResponseFn).toHaveBeenCalledWith(false);
  });
});
