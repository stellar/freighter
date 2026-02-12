import { SERVICE_TYPES } from "@shared/constants/services";
import {
  EntryQueue,
  ResponseQueue,
  SignAuthEntryResponse,
  SignAuthEntryMessage,
} from "@shared/api/types/message-request";
import { signAuthEntry } from "../handlers/signAuthEntry";

const MOCK_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const MOCK_SECRET = "SCZANGBA5YHTNYVVV3C7CAZMCLXPILHSE6PGYIGE2QHKDXUSUONTLHSK";

jest.mock("background/helpers/session", () => ({
  getEncryptedTemporaryData: jest.fn(),
}));

jest.mock("background/helpers/account", () => ({
  getNetworkDetails: jest.fn().mockResolvedValue({
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
}));

jest.mock("@shared/helpers/stellar", () => {
  const signResult = Buffer.from("signed-entry");
  return {
    getSdk: jest.fn().mockReturnValue({
      Keypair: {
        fromSecret: () => ({
          publicKey: () =>
            "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
          sign: jest.fn().mockReturnValue(signResult),
        }),
      },
      hash: jest.fn().mockReturnValue(Buffer.from("hashed")),
    }),
  };
});

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

const makeAuthEntryData = (uuid: string) => ({
  authEntry: {
    entry: btoa("test-entry"),
    domain: "example.com",
    url: "https://example.com",
    uuid,
  } as any,
  uuid,
});

describe("signAuthEntry handler", () => {
  let authEntryQueue: EntryQueue;
  let responseQueue: ResponseQueue<SignAuthEntryResponse>;
  let mockResponseFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    authEntryQueue = [];
    responseQueue = [];
    mockResponseFn = jest.fn();

    const sessionModule = require("background/helpers/session");
    sessionModule.getEncryptedTemporaryData.mockResolvedValue(MOCK_SECRET);
  });

  it("finds the correct auth entry by uuid and signs it", async () => {
    authEntryQueue.push(
      makeAuthEntryData("uuid-1"),
      makeAuthEntryData("uuid-2"),
      makeAuthEntryData("uuid-3"),
    );
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-2" });

    const request: SignAuthEntryMessage = {
      type: SERVICE_TYPES.SIGN_AUTH_ENTRY,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-2",
    };

    await signAuthEntry({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      authEntryQueue,
      responseQueue,
    });

    expect(authEntryQueue).toHaveLength(2);
    expect(authEntryQueue.map((e) => e.uuid)).toEqual(["uuid-1", "uuid-3"]);
    expect(mockResponseFn).toHaveBeenCalled();
  });

  it("does not sign when uuid is not found in queue", async () => {
    authEntryQueue.push(makeAuthEntryData("uuid-1"));
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request: SignAuthEntryMessage = {
      type: SERVICE_TYPES.SIGN_AUTH_ENTRY,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "non-existent-uuid",
    };

    await signAuthEntry({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      authEntryQueue,
      responseQueue,
    });

    expect(authEntryQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
    expect(responseQueue).toHaveLength(1);
  });

  it("returns error when uuid is undefined", async () => {
    authEntryQueue.push(makeAuthEntryData("uuid-1"));
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request: SignAuthEntryMessage = {
      type: SERVICE_TYPES.SIGN_AUTH_ENTRY,
      activePublicKey: MOCK_PUBLIC_KEY,
    };

    const result = await signAuthEntry({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      authEntryQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Missing uuid" });
    expect(authEntryQueue).toHaveLength(1);
  });

  it("removes only the matched item from a multi-item queue", async () => {
    authEntryQueue.push(
      makeAuthEntryData("aaa"),
      makeAuthEntryData("bbb"),
      makeAuthEntryData("ccc"),
    );
    responseQueue.push({ response: mockResponseFn, uuid: "ccc" });

    const request: SignAuthEntryMessage = {
      type: SERVICE_TYPES.SIGN_AUTH_ENTRY,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "ccc",
    };

    await signAuthEntry({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      authEntryQueue,
      responseQueue,
    });

    expect(authEntryQueue).toHaveLength(2);
    expect(authEntryQueue[0].uuid).toBe("aaa");
    expect(authEntryQueue[1].uuid).toBe("bbb");
  });

  it("returns session timeout error when no private key", async () => {
    const sessionModule = require("background/helpers/session");
    sessionModule.getEncryptedTemporaryData.mockResolvedValueOnce("");

    const request: SignAuthEntryMessage = {
      type: SERVICE_TYPES.SIGN_AUTH_ENTRY,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    const result = await signAuthEntry({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      authEntryQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Session timed out" });
  });
});
