import { getAnalyticsUserId } from "../analyticsUserId";
import { callBackendV2 } from "background/helpers/callBackendV2";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { clearLinkStatus } from "background/helpers/link-status";
import { getSigningIdentity } from "background/helpers/signing-identity";
import { CANONICAL_USER_ID } from "constants/localStorageTypes";

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

const sessionStore = {} as never;

const makeLocalStore = () => {
  const data: Record<string, unknown> = {};
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
      confirmed: true,
    });
    expect(mockIdentity).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("returns null when locked with nothing cached", async () => {
    const { store } = makeLocalStore();
    mockIdentity.mockResolvedValue(null);

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      confirmed: false,
    });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("asks GET /user and caches the canonical id", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockResolvedValue(userResponse(ROOT));

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: ROOT,
      confirmed: true,
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
      confirmed: false,
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
        confirmed: false,
      });
    }
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("ignores a 200 without a user id", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockResolvedValue({ status: 200, body: { userId: ROOT } });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: PINNED,
      confirmed: false,
    });
    expect(data[CANONICAL_USER_ID]).toBeUndefined();
  });

  it("drops the answer when the wallet is replaced mid-request", async () => {
    const { store, data } = makeLocalStore();
    mockCall.mockImplementation(async () => {
      await clearLinkStatus({ localStore: store });
      return userResponse(ROOT);
    });

    expect(await getAnalyticsUserId(sessionStore, store)).toEqual({
      analyticsUserId: null,
      confirmed: false,
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
      confirmed: false,
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
      confirmed: false,
    });
  });

  it("never returns keypair/private material", async () => {
    const { store } = makeLocalStore();
    mockCall.mockResolvedValue({ status: 404, body: null });

    const result = await getAnalyticsUserId(sessionStore, store);

    expect(JSON.stringify(result)).not.toContain("priv");
  });
});
