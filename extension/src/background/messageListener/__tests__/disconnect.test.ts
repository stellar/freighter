import browser from "webextension-polyfill";
import { Store } from "redux";

import { EXTERNAL_SERVICE_TYPES } from "@shared/constants/services";
import { ExternalRequest } from "@shared/api/types";
import {
  FreighterApiInternalError,
  FreighterApiLockedError,
} from "@shared/api/helpers/extensionMessaging";
import { ALLOWLIST_ID, NETWORK_ID } from "constants/localStorageTypes";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { freighterApiMessageListener } from "../freighterApiMessageListener";

const { publicKeySelector, sessionSlice, timeoutAccountAccess } =
  jest.requireActual("background/ducks/session");

const ACTIVE_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const OTHER_PUBLIC_KEY =
  "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY";

const mockPublicKeySelector = jest.fn();

jest.mock("background/ducks/session", () => ({
  ...jest.requireActual("background/ducks/session"),
  publicKeySelector: (state: unknown) => mockPublicKeySelector(state),
}));

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const makeLocalStore = (initial: Record<string, unknown>) => {
  const data: Record<string, unknown> = { ...initial };

  return {
    data,
    store: {
      getItem: jest.fn((key: string) => Promise.resolve(data[key])),
      setItem: jest.fn((key: string, value: unknown) => {
        data[key] = value;
        return Promise.resolve();
      }),
    } as unknown as DataStorageAccess,
  };
};

const disconnect = (localStore: DataStorageAccess, url: string) =>
  freighterApiMessageListener(
    { type: EXTERNAL_SERVICE_TYPES.DISCONNECT } as ExternalRequest,
    { url } as browser.Runtime.MessageSender,
    { getState: () => ({}) } as unknown as Store,
    localStore,
  );

describe("freighterApiMessageListener DISCONNECT", () => {
  const initialAllowList = {
    Testnet: {
      [ACTIVE_PUBLIC_KEY]: ["example.com", "other.com"],
      [OTHER_PUBLIC_KEY]: ["example.com"],
    },
    Mainnet: {
      [ACTIVE_PUBLIC_KEY]: ["example.com"],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPublicKeySelector.mockReturnValue(ACTIVE_PUBLIC_KEY);
  });

  it("removes the calling domain for the active account and network only", async () => {
    const { data, store } = makeLocalStore({
      [NETWORK_ID]: { networkName: "Testnet" },
      [ALLOWLIST_ID]: initialAllowList,
    });

    const response = await disconnect(store, "https://example.com/app");

    expect(response).toEqual({});
    expect(data[ALLOWLIST_ID]).toEqual({
      Testnet: {
        [ACTIVE_PUBLIC_KEY]: ["other.com"],
        [OTHER_PUBLIC_KEY]: ["example.com"],
      },
      Mainnet: {
        [ACTIVE_PUBLIC_KEY]: ["example.com"],
      },
    });
  });

  it("succeeds without changes when the domain isn't connected", async () => {
    const { data, store } = makeLocalStore({
      [NETWORK_ID]: { networkName: "Testnet" },
      [ALLOWLIST_ID]: initialAllowList,
    });

    const response = await disconnect(store, "https://not-connected.com");

    expect(response).toEqual({});
    expect(data[ALLOWLIST_ID]).toEqual(initialAllowList);
    expect(store.setItem).not.toHaveBeenCalled();
  });

  it("removes the domain after an idle lock, which keeps the public key", async () => {
    mockPublicKeySelector.mockImplementation(publicKeySelector);
    const { data, store } = makeLocalStore({
      [NETWORK_ID]: { networkName: "Testnet" },
      [ALLOWLIST_ID]: initialAllowList,
    });

    const response = await freighterApiMessageListener(
      { type: EXTERNAL_SERVICE_TYPES.DISCONNECT } as ExternalRequest,
      { url: "https://example.com" } as browser.Runtime.MessageSender,
      {
        getState: () => ({
          session: {
            ...sessionSlice.reducer(undefined, timeoutAccountAccess()),
            publicKey: ACTIVE_PUBLIC_KEY,
          },
        }),
      } as unknown as Store,
      store,
    );

    expect(response).toEqual({});
    expect(
      (data[ALLOWLIST_ID] as typeof initialAllowList).Testnet[
        ACTIVE_PUBLIC_KEY
      ],
    ).toEqual(["other.com"]);
  });

  it("returns a locked error and leaves the allowlist untouched before the first unlock", async () => {
    mockPublicKeySelector.mockReturnValue("");
    const { data, store } = makeLocalStore({
      [NETWORK_ID]: { networkName: "Testnet" },
      [ALLOWLIST_ID]: initialAllowList,
    });

    const response = await disconnect(store, "https://example.com");

    expect(response).toEqual({
      apiError: FreighterApiLockedError,
      error: FreighterApiLockedError.message,
    });
    expect(data[ALLOWLIST_ID]).toEqual(initialAllowList);
  });

  it("returns an internal error when storage fails", async () => {
    const store = {
      getItem: jest.fn().mockRejectedValue(new Error("storage failure")),
      setItem: jest.fn(),
    } as unknown as DataStorageAccess;

    const response = await disconnect(store, "https://example.com");

    expect(response).toEqual({
      apiError: FreighterApiInternalError,
      error: FreighterApiInternalError.message,
    });
  });
});
