import { SERVICE_TYPES } from "@shared/constants/services";
import {
  BlobQueue,
  ResponseQueue,
  SignBlobResponse,
  SignBlobMessage,
} from "@shared/api/types/message-request";
import { signBlob } from "../handlers/signBlob";

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
  const signResult = Buffer.from("signed-blob");
  return {
    getSdk: jest.fn().mockReturnValue({
      Keypair: {
        fromSecret: () => ({
          publicKey: () =>
            "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
          sign: jest.fn().mockReturnValue(signResult),
        }),
      },
    }),
    isPlaywright: false,
  };
});

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

jest.mock("helpers/stellar", () => ({
  encodeSep53Message: jest.fn((msg: string) => Buffer.from(msg)),
}));

const mockLocalStore = {
  getItem: jest.fn().mockResolvedValue("mock-key-id"),
  setItem: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
} as any;

const mockSessionStore = {} as any;

const makeBlobData = (uuid: string) => ({
  blob: {
    apiVersion: "5.0.0",
    domain: "example.com",
    message: btoa("test-message"),
    url: "https://example.com",
    uuid,
  } as any,
  uuid,
});

describe("signBlob handler", () => {
  let blobQueue: BlobQueue;
  let responseQueue: ResponseQueue<SignBlobResponse>;
  let mockResponseFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    blobQueue = [];
    responseQueue = [];
    mockResponseFn = jest.fn();

    const sessionModule = require("background/helpers/session");
    sessionModule.getEncryptedTemporaryData.mockResolvedValue(MOCK_SECRET);
  });

  it("finds the correct blob by uuid and signs it", async () => {
    blobQueue.push(
      makeBlobData("uuid-1"),
      makeBlobData("uuid-2"),
      makeBlobData("uuid-3"),
    );
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-2" });

    const request: SignBlobMessage = {
      type: SERVICE_TYPES.SIGN_BLOB,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-2",
      apiVersion: "5.0.0",
    };

    await signBlob({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      blobQueue,
      responseQueue,
    });

    expect(blobQueue).toHaveLength(2);
    expect(blobQueue.map((b) => b.uuid)).toEqual(["uuid-1", "uuid-3"]);
    expect(mockResponseFn).toHaveBeenCalled();
  });

  it("does not sign when uuid is not found in queue", async () => {
    blobQueue.push(makeBlobData("uuid-1"));
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request: SignBlobMessage = {
      type: SERVICE_TYPES.SIGN_BLOB,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "non-existent-uuid",
    };

    await signBlob({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      blobQueue,
      responseQueue,
    });

    expect(blobQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
    expect(responseQueue).toHaveLength(1);
  });

  it("returns error when uuid is undefined", async () => {
    blobQueue.push(makeBlobData("uuid-1"));
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request: SignBlobMessage = {
      type: SERVICE_TYPES.SIGN_BLOB,
      activePublicKey: MOCK_PUBLIC_KEY,
    };

    const result = await signBlob({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      blobQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Missing uuid" });
    expect(blobQueue).toHaveLength(1);
  });

  it("removes only the matched item from a multi-item queue", async () => {
    blobQueue.push(
      makeBlobData("aaa"),
      makeBlobData("bbb"),
      makeBlobData("ccc"),
    );
    responseQueue.push({ response: mockResponseFn, uuid: "aaa" });

    const request: SignBlobMessage = {
      type: SERVICE_TYPES.SIGN_BLOB,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "aaa",
    };

    await signBlob({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      blobQueue,
      responseQueue,
    });

    expect(blobQueue).toHaveLength(2);
    expect(blobQueue[0].uuid).toBe("bbb");
    expect(blobQueue[1].uuid).toBe("ccc");
  });

  it("extracts apiVersion from request", async () => {
    blobQueue.push(makeBlobData("uuid-1"));
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request: SignBlobMessage = {
      type: SERVICE_TYPES.SIGN_BLOB,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
      apiVersion: "5.0.0",
    };

    await signBlob({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      blobQueue,
      responseQueue,
    });

    expect(mockResponseFn).toHaveBeenCalled();
  });

  it("returns session timeout error when no private key", async () => {
    const sessionModule = require("background/helpers/session");
    sessionModule.getEncryptedTemporaryData.mockResolvedValueOnce("");

    const request: SignBlobMessage = {
      type: SERVICE_TYPES.SIGN_BLOB,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    const result = await signBlob({
      request,
      localStore: mockLocalStore,
      sessionStore: mockSessionStore,
      blobQueue,
      responseQueue,
    });

    expect(result).toEqual({ error: "Session timed out" });
  });
});
