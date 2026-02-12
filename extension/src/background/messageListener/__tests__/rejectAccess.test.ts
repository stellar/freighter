import { SERVICE_TYPES } from "@shared/constants/services";
import {
  ResponseQueue,
  RejectAccessResponse,
  RejectAccessMessage,
} from "@shared/api/types/message-request";
import { rejectAccess } from "../handlers/rejectAccess";
import { captureException } from "@sentry/browser";

const MOCK_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

describe("rejectAccess handler", () => {
  let responseQueue: ResponseQueue<RejectAccessResponse>;
  let mockResponseFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    responseQueue = [];
    mockResponseFn = jest.fn();
  });

  it("finds the correct response by uuid and rejects it", () => {
    const mockResponseFn1 = jest.fn();
    const mockResponseFn2 = jest.fn();
    const mockResponseFn3 = jest.fn();

    responseQueue.push(
      { response: mockResponseFn1, uuid: "uuid-1" },
      { response: mockResponseFn2, uuid: "uuid-2" },
      { response: mockResponseFn3, uuid: "uuid-3" },
    );

    const request: RejectAccessMessage = {
      type: SERVICE_TYPES.REJECT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-2",
    };

    rejectAccess({
      request,
      responseQueue,
    });

    expect(responseQueue).toHaveLength(2);
    expect(responseQueue.map((r) => r.uuid)).toEqual(["uuid-1", "uuid-3"]);
    expect(mockResponseFn1).not.toHaveBeenCalled();
    expect(mockResponseFn2).toHaveBeenCalledWith(undefined);
    expect(mockResponseFn3).not.toHaveBeenCalled();
  });

  it("does not remove items when uuid is not found in queue", () => {
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request: RejectAccessMessage = {
      type: SERVICE_TYPES.REJECT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "non-existent-uuid",
    };

    rejectAccess({
      request,
      responseQueue,
    });

    expect(responseQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(
      "rejectAccess: no matching response found for uuid non-existent-uuid",
    );
  });

  it("returns early and logs error when uuid is undefined", () => {
    responseQueue.push({ response: mockResponseFn, uuid: "uuid-1" });

    const request = {
      type: SERVICE_TYPES.REJECT_ACCESS,
    } as RejectAccessMessage;

    rejectAccess({
      request,
      responseQueue,
    });

    expect(captureException).toHaveBeenCalledWith(
      "rejectAccess: missing uuid in request",
    );
    expect(responseQueue).toHaveLength(1);
    expect(mockResponseFn).not.toHaveBeenCalled();
  });

  it("removes only the matched item from a multi-item queue", () => {
    const mockResponseFn1 = jest.fn();
    const mockResponseFn2 = jest.fn();
    const mockResponseFn3 = jest.fn();

    responseQueue.push(
      { response: mockResponseFn1, uuid: "aaa" },
      { response: mockResponseFn2, uuid: "bbb" },
      { response: mockResponseFn3, uuid: "ccc" },
    );

    const request: RejectAccessMessage = {
      type: SERVICE_TYPES.REJECT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "bbb",
    };

    rejectAccess({
      request,
      responseQueue,
    });

    expect(responseQueue).toHaveLength(2);
    expect(responseQueue[0].uuid).toBe("aaa");
    expect(responseQueue[1].uuid).toBe("ccc");
    expect(mockResponseFn1).not.toHaveBeenCalled();
    expect(mockResponseFn2).toHaveBeenCalledWith(undefined);
    expect(mockResponseFn3).not.toHaveBeenCalled();
  });

  it("handles empty response queue gracefully", () => {
    const request: RejectAccessMessage = {
      type: SERVICE_TYPES.REJECT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    rejectAccess({
      request,
      responseQueue,
    });

    expect(responseQueue).toHaveLength(0);
    expect(captureException).toHaveBeenCalledWith(
      "rejectAccess: no matching response found for uuid uuid-1",
    );
  });

  it("processes first matching uuid when multiple items have same uuid", () => {
    const mockResponseFn1 = jest.fn();
    const mockResponseFn2 = jest.fn();

    responseQueue.push(
      { response: mockResponseFn1, uuid: "uuid-1" },
      { response: mockResponseFn2, uuid: "uuid-1" },
    );

    const request: RejectAccessMessage = {
      type: SERVICE_TYPES.REJECT_ACCESS,
      activePublicKey: MOCK_PUBLIC_KEY,
      uuid: "uuid-1",
    };

    rejectAccess({
      request,
      responseQueue,
    });

    expect(responseQueue).toHaveLength(1);
    expect(responseQueue[0].uuid).toBe("uuid-1");
    expect(mockResponseFn1).toHaveBeenCalledWith(undefined);
    expect(mockResponseFn2).not.toHaveBeenCalled();
  });
});
