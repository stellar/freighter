import { SERVICE_TYPES } from "@shared/constants/services";
import {
  ResponseQueue,
  RequestAccessResponse,
  GrantAccessMessage,
} from "@shared/api/types/message-request";
import { grantAccess } from "../handlers/grantAccess";
import { captureException } from "@sentry/browser";
import * as accountHelpers from "background/helpers/account";

const MOCK_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const MOCK_URL = "https://example.com";
const MOCK_NETWORK_DETAILS = {
  network: "TESTNET",
  networkName: "Test Net",
  networkUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
};

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

jest.mock("background/helpers/account", () => ({
  getNetworkDetails: jest.fn(),
  setAllowListDomain: jest.fn(),
}));

jest.mock("background/ducks/session", () => ({
  publicKeySelector: () => MOCK_PUBLIC_KEY,
}));

jest.mock("helpers/urls", () => ({
  getUrlHostname: (url: string) => url,
  getPunycodedDomain: (domain: string) => domain,
}));

describe("grantAccess handler", () => {
  let responseQueue: ResponseQueue<RequestAccessResponse>;
  let mockResponseFn: jest.Mock;
  let mockLocalStore: {
    getItem: jest.Mock;
    setItem: jest.Mock;
  };
  let mockSessionStore: {
    getState: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    responseQueue = [];
    mockResponseFn = jest.fn().mockReturnValue({ publicKey: MOCK_PUBLIC_KEY });
    mockLocalStore = {
      getItem: jest.fn(),
      setItem: jest.fn(),
    };
    mockSessionStore = {
      getState: jest.fn().mockReturnValue({}),
    };
    (accountHelpers.getNetworkDetails as jest.Mock).mockResolvedValue(
      MOCK_NETWORK_DETAILS,
    );
    (accountHelpers.setAllowListDomain as jest.Mock).mockResolvedValue([
      MOCK_URL,
    ]);
  });

  it("grants access and sets allowlist for valid queue item", async () => {
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: GrantAccessMessage = {
      type: SERVICE_TYPES.GRANT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      url: MOCK_URL,
      uuid: "uuid-1",
    };

    const result = await grantAccess({
      request,
      sessionStore: mockSessionStore as any,
      responseQueue,
      localStore: mockLocalStore as any,
    });

    expect(responseQueue).toHaveLength(0);
    expect(mockResponseFn).toHaveBeenCalledWith(MOCK_URL, MOCK_PUBLIC_KEY);
    expect(accountHelpers.setAllowListDomain).toHaveBeenCalledWith({
      publicKey: MOCK_PUBLIC_KEY,
      networkDetails: MOCK_NETWORK_DETAILS,
      domain: MOCK_URL,
      localStore: mockLocalStore,
    });
    expect(result).toEqual({ publicKey: MOCK_PUBLIC_KEY });
  });

  it("does NOT set allowlist when uuid is not found in queue", async () => {
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: GrantAccessMessage = {
      type: SERVICE_TYPES.GRANT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      url: MOCK_URL,
      uuid: "non-existent-uuid",
    };

    const result = await grantAccess({
      request,
      sessionStore: mockSessionStore as any,
      responseQueue,
      localStore: mockLocalStore as any,
    });

    expect(responseQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
    expect(accountHelpers.setAllowListDomain).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(
      "grantAccess: no matching response found for uuid non-existent-uuid",
    );
    expect(result).toEqual({ error: "Access was denied" });
  });

  it("returns early and logs error when uuid is undefined", async () => {
    responseQueue.push({
      response: mockResponseFn,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request = {
      type: SERVICE_TYPES.GRANT_ACCESS,
      url: MOCK_URL,
    } as GrantAccessMessage;

    const result = await grantAccess({
      request,
      sessionStore: mockSessionStore as any,
      responseQueue,
      localStore: mockLocalStore as any,
    });

    expect(captureException).toHaveBeenCalledWith(
      "grantAccess: missing uuid in request",
    );
    expect(responseQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
    expect(accountHelpers.setAllowListDomain).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "Access was denied" });
  });

  it("does NOT set allowlist when queue is empty", async () => {
    const request: GrantAccessMessage = {
      type: SERVICE_TYPES.GRANT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      url: MOCK_URL,
      uuid: "uuid-1",
    };

    const result = await grantAccess({
      request,
      sessionStore: mockSessionStore as any,
      responseQueue,
      localStore: mockLocalStore as any,
    });

    expect(responseQueue).toHaveLength(0);
    expect(accountHelpers.setAllowListDomain).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(
      "grantAccess: no matching response found for uuid uuid-1",
    );
    expect(result).toEqual({ error: "Access was denied" });
  });

  it("finds the correct response by uuid in multi-item queue", async () => {
    const mockResponseFn1 = jest.fn().mockReturnValue({ result: 1 });
    const mockResponseFn2 = jest.fn().mockReturnValue({ result: 2 });
    const mockResponseFn3 = jest.fn().mockReturnValue({ result: 3 });

    responseQueue.push(
      { response: mockResponseFn1, uuid: "uuid-1", createdAt: Date.now() },
      { response: mockResponseFn2, uuid: "uuid-2", createdAt: Date.now() },
      { response: mockResponseFn3, uuid: "uuid-3", createdAt: Date.now() },
    );

    const request: GrantAccessMessage = {
      type: SERVICE_TYPES.GRANT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      url: MOCK_URL,
      uuid: "uuid-2",
    };

    const result = await grantAccess({
      request,
      sessionStore: mockSessionStore as any,
      responseQueue,
      localStore: mockLocalStore as any,
    });

    expect(responseQueue).toHaveLength(2);
    expect(responseQueue.map((r) => r.uuid)).toEqual(["uuid-1", "uuid-3"]);
    expect(mockResponseFn1).not.toHaveBeenCalled();
    expect(mockResponseFn2).toHaveBeenCalledWith(MOCK_URL, MOCK_PUBLIC_KEY);
    expect(mockResponseFn3).not.toHaveBeenCalled();
    expect(accountHelpers.setAllowListDomain).toHaveBeenCalled();
    expect(result).toEqual({ result: 2 });
  });

  it("does NOT set allowlist when response is not a function", async () => {
    responseQueue.push({
      response: "not-a-function" as any,
      uuid: "uuid-1",
      createdAt: Date.now(),
    });

    const request: GrantAccessMessage = {
      type: SERVICE_TYPES.GRANT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      url: MOCK_URL,
      uuid: "uuid-1",
    };

    const result = await grantAccess({
      request,
      sessionStore: mockSessionStore as any,
      responseQueue,
      localStore: mockLocalStore as any,
    });

    expect(accountHelpers.setAllowListDomain).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(
      "grantAccess: no matching response found for uuid uuid-1",
    );
    expect(result).toEqual({ error: "Access was denied" });
  });
});
