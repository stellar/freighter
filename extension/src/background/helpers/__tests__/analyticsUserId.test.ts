import { getAnalyticsUserId } from "../analyticsUserId";
import { callBackendV2 } from "background/helpers/callBackendV2";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { clearLinkStatus } from "background/helpers/link-status";
import { getSigningIdentity } from "background/helpers/signing-identity";
import {
  CANONICAL_USER_ID,
  PINNED_SOURCE_ID,
} from "constants/localStorageTypes";

jest.mock("background/helpers/signing-identity", () => ({
  getSigningIdentity: jest.fn(),
}));
jest.mock("background/helpers/callBackendV2", () => ({
  callBackendV2: jest.fn(),
}));
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

const mockIdentity = getSigningIdentity as jest.Mock;
const mockCall = callBackendV2 as jest.Mock;

const PINNED = "a".repeat(64);
const ROOT = "b".repeat(64);
const FALLBACK = "c".repeat(64);

const sessionStore = {} as never;

const makeLocalStore = () => {
  // The signer the tests mock is the pin unless a test says otherwise.
  const data: Record<string, unknown> = { [PINNED_SOURCE_ID]: PINNED };
  const store = {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      data[key] = value;
    }),
    remove: jest.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete data[key];
      }
    }),
  } as unknown as DataStorageAccess;
  return { store, data };
};

const userResponse = (userId: string) => ({
  status: 200,
  body: { data: { userId, sources: [{ id: userId, kind: "mnemonic" }] } },
});

describe("getAnalyticsUserId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdentity.mockResolvedValue({
      sourceId: PINNED,
      keypair: { SECRET: "priv" },
    });
  });

  it("returns the cached id without a signer or a request, as when locked", async () => {
    const { store, data } = makeLocalStore();
    data[CANONICAL_USER_ID] = ROOT;
    mockIdentity.mockResolvedValue(null);

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: ROOT,
      isConfirmed: true,
    });
    expect(mockIdentity).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("returns null when locked with nothing cached", async () => {
    const { store } = makeLocalStore();
    mockIdentity.mockResolvedValue(null);

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("asks GET /user and caches the canonical id", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockResolvedValue(userResponse(ROOT));

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: ROOT,
      isConfirmed: true,
    });
    expect(mockCall).toHaveBeenCalledWith({
      method: "GET",
      path: "/user",
      sessionStore,
      localStore: store,
    });
    expect(data[CANONICAL_USER_ID]).toBe(ROOT);

    // The next call is served from the cache.
    await getAnalyticsUserId(sessionStore, store);
    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it("returns the pinned id, unconfirmed and uncached, before the first link", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockResolvedValue({ status: 404, body: null });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: PINNED,
      isConfirmed: false,
    });
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("falls back to the pinned id when offline or on a server error", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    mockCall.mockResolvedValueOnce({ status: 503, body: null });

    for (let i = 0; i < 2; i += 1) {
      expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
        analyticsUserId: PINNED,
        isConfirmed: false,
      });
    }
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("ignores a 200 without a user id", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockResolvedValue({ status: 200, body: { userId: ROOT } });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: PINNED,
      isConfirmed: false,
    });
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it.each([
    ["not hex", "not-an-id"],
    ["uppercase hex", "B".repeat(64)],
    ["63 chars", "b".repeat(63)],
    ["65 chars", "b".repeat(65)],
  ])("ignores a 200 whose user id is %s", async (_label, userId) => {
    const { store, data } = makeLocalStore();
    mockCall.mockResolvedValue(userResponse(userId));

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: PINNED,
      isConfirmed: false,
    });
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("ignores a malformed cached id and asks GET /user again", async () => {
    const { store, data } = makeLocalStore();
    data[CANONICAL_USER_ID] = "garbage";
    mockCall.mockResolvedValue(userResponse(ROOT));

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: ROOT,
      isConfirmed: true,
    });
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(data[CANONICAL_USER_ID]).toBe(ROOT);
  });

  it("drops the answer when the wallet is replaced mid-request", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockImplementation(async () => {
      await clearLinkStatus({ localStore: store });
      return userResponse(ROOT);
    });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("returns no id when the wallet is replaced during the cache read", async () => {
    const { store, data } = makeLocalStore();
    data[CANONICAL_USER_ID] = ROOT;
    // The read returns the old wallet's id; the clear lands before it resolves.
    (store.getItem as jest.Mock).mockImplementationOnce(async (key: string) => {
      const value = data[key];
      await clearLinkStatus({ localStore: store });
      return value;
    });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("returns no id when the wallet is replaced during the cache write", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockResolvedValue(userResponse(ROOT));
    // The clear lands after the write, so it removes what was written.
    (store.setItem as jest.Mock).mockImplementationOnce(
      async (key: string, value: unknown) => {
        data[key] = value;
        await clearLinkStatus({ localStore: store });
      },
    );

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("returns no id when the wallet is replaced during a 404", async () => {
    const { store } = makeLocalStore();
    mockCall.mockImplementation(async () => {
      await clearLinkStatus({ localStore: store });
      return { status: 404, body: null };
    });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
  });

  it("returns no id when the wallet is replaced during a failed request", async () => {
    const { store } = makeLocalStore();
    mockCall.mockImplementation(async () => {
      await clearLinkStatus({ localStore: store });
      throw new Error("offline");
    });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
  });

  it("skips GET /user when the signer is a fallback source, not the pin", async () => {
    const { store, data } = makeLocalStore();
    // The pin didn't derive this unlock, so getSigningIdentity fell back to
    // another held source. A 200 signed by it would be that source's user.
    mockIdentity.mockResolvedValue({
      sourceId: FALLBACK,
      keypair: { SECRET: "priv" },
    });
    mockCall.mockResolvedValue(userResponse(ROOT));

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: PINNED,
      isConfirmed: false,
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("returns no id and skips GET /user when no pin is stored", async () => {
    const { store, data } = makeLocalStore();
    delete data[PINNED_SOURCE_ID];
    mockCall.mockResolvedValue(userResponse(ROOT));

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("returns no id when the wallet is replaced during the pin read", async () => {
    const { store } = makeLocalStore();
    mockIdentity.mockResolvedValue({
      sourceId: FALLBACK,
      keypair: { SECRET: "priv" },
    });
    // First read is the cache; the second is the pin.
    const getItem = store.getItem as jest.Mock;
    const read = getItem.getMockImplementation()!;
    getItem
      .mockImplementationOnce(read)
      .mockImplementationOnce(async (key: string) => {
        const value = await read(key);
        await clearLinkStatus({ localStore: store });
        return value;
      });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("never returns keypair/private material", async () => {
    const { store } = makeLocalStore();
    mockCall.mockResolvedValue({ status: 404, body: null });

    const result = await getAnalyticsUserId(sessionStore, store);

    expect(JSON.stringify(result)).not.toContain("priv");
  });
});
