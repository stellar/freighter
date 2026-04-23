import {
  rejectSigningRequest,
  removeUuidFromAllQueues,
} from "../handlers/rejectSigningRequest";
import * as Sentry from "@sentry/browser";

jest.mock("@sentry/browser");

const now = Date.now();

const makeResponseQueueItem = (uuid: string) => {
  const response = jest.fn();
  return { uuid, response, createdAt: now };
};

const makeTxQueueItem = (uuid: string) => ({
  uuid,
  transaction: {} as any,
  createdAt: now,
});
const makeBlobQueueItem = (uuid: string) => ({
  uuid,
  blob: {} as any,
  createdAt: now,
});
const makeAuthEntryQueueItem = (uuid: string) => ({
  uuid,
  authEntry: {} as any,
  createdAt: now,
});
const makeTokenQueueItem = (uuid: string) => ({
  uuid,
  token: {} as any,
  createdAt: now,
});

const buildEmptyQueues = () => ({
  responseQueue: [] as any[],
  transactionQueue: [] as any[],
  blobQueue: [] as any[],
  authEntryQueue: [] as any[],
  tokenQueue: [] as any[],
});

describe("rejectSigningRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls response with undefined and returns {} when UUID is found in responseQueue", () => {
    const item = makeResponseQueueItem("uuid-1");
    const queues = {
      ...buildEmptyQueues(),
      responseQueue: [item],
    };

    const result = rejectSigningRequest({
      request: { uuid: "uuid-1" } as any,
      ...queues,
    });

    expect(item.response).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({});
    expect(queues.responseQueue).toHaveLength(0);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("captures a Sentry exception and returns {} when UUID is not found in any queue", () => {
    const queues = buildEmptyQueues();

    const result = rejectSigningRequest({
      request: { uuid: "missing-uuid" } as any,
      ...queues,
    });

    expect(result).toEqual({});
    expect(Sentry.captureException).toHaveBeenCalledWith(
      "rejectSigningRequest: no matching response found for uuid missing-uuid",
    );
  });

  it("returns {} and captures a Sentry exception when UUID is missing from the request", () => {
    const queues = buildEmptyQueues();

    const result = rejectSigningRequest({
      request: {} as any,
      ...queues,
    });

    expect(result).toEqual({});
    expect(Sentry.captureException).toHaveBeenCalledWith(
      "rejectSigningRequest: missing uuid in request",
    );
  });

  it("cleans up all queue types along with responseQueue", () => {
    const uuid = "uuid-all";
    const responseItem = makeResponseQueueItem(uuid);
    const queues = {
      responseQueue: [responseItem],
      transactionQueue: [makeTxQueueItem(uuid)],
      blobQueue: [makeBlobQueueItem(uuid)],
      authEntryQueue: [makeAuthEntryQueueItem(uuid)],
      tokenQueue: [makeTokenQueueItem(uuid)],
    };

    const result = rejectSigningRequest({
      request: { uuid } as any,
      ...queues,
    });

    expect(result).toEqual({});
    expect(responseItem.response).toHaveBeenCalledWith(undefined);
    expect(queues.responseQueue).toHaveLength(0);
    expect(queues.transactionQueue).toHaveLength(0);
    expect(queues.blobQueue).toHaveLength(0);
    expect(queues.authEntryQueue).toHaveLength(0);
    expect(queues.tokenQueue).toHaveLength(0);
  });
});

describe("removeUuidFromAllQueues", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns true when a matching response is found, false when not", () => {
    const item = makeResponseQueueItem("uuid-found");
    const queuesWithMatch = {
      ...buildEmptyQueues(),
      responseQueue: [item],
    };

    const foundResult = removeUuidFromAllQueues("uuid-found", queuesWithMatch);
    expect(foundResult).toBe(true);
    expect(item.response).toHaveBeenCalledWith(undefined);

    const queuesWithoutMatch = buildEmptyQueues();
    const notFoundResult = removeUuidFromAllQueues(
      "uuid-missing",
      queuesWithoutMatch,
    );
    expect(notFoundResult).toBe(false);
  });

  it("only removes the matching UUID and leaves others untouched", () => {
    const keep = makeResponseQueueItem("uuid-keep");
    const remove = makeResponseQueueItem("uuid-remove");
    const keepTx = makeTxQueueItem("uuid-keep");
    const removeTx = makeTxQueueItem("uuid-remove");
    const keepBlob = makeBlobQueueItem("uuid-keep");
    const removeBlob = makeBlobQueueItem("uuid-remove");
    const keepAuth = makeAuthEntryQueueItem("uuid-keep");
    const removeAuth = makeAuthEntryQueueItem("uuid-remove");
    const keepToken = makeTokenQueueItem("uuid-keep");
    const removeToken = makeTokenQueueItem("uuid-remove");

    const queues = {
      responseQueue: [keep, remove] as any[],
      transactionQueue: [keepTx, removeTx] as any[],
      blobQueue: [keepBlob, removeBlob] as any[],
      authEntryQueue: [keepAuth, removeAuth] as any[],
      tokenQueue: [keepToken, removeToken] as any[],
    };

    removeUuidFromAllQueues("uuid-remove", queues);

    expect(queues.responseQueue).toEqual([keep]);
    expect(queues.transactionQueue).toEqual([keepTx]);
    expect(queues.blobQueue).toEqual([keepBlob]);
    expect(queues.authEntryQueue).toEqual([keepAuth]);
    expect(queues.tokenQueue).toEqual([keepToken]);

    expect(remove.response).toHaveBeenCalledWith(undefined);
    expect(keep.response).not.toHaveBeenCalled();
  });
});
