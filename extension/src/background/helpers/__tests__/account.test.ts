import {
  getIsRpcHealthy,
  removeAllowListDomain,
  setAllowListDomain,
} from "../account";
import { ALLOWLIST_ID, NETWORK_ID } from "constants/localStorageTypes";
import { DEFAULT_NETWORKS } from "@shared/constants/stellar";
import type { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { callBackendV2 } from "background/helpers/callBackendV2";

jest.mock("background/helpers/callBackendV2");

jest.mock("@shared/helpers/stellar", () => {
  const actual = jest.requireActual("@shared/helpers/stellar");
  return {
    ...actual,
    isCustomNetwork: jest.fn(),
  };
});

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

describe("getIsRpcHealthy", () => {
  const mockedCallBackendV2 = callBackendV2 as jest.Mock;
  const mockIsCustomNetwork = jest.requireMock("@shared/helpers/stellar")
    .isCustomNetwork as jest.Mock;
  const mockCaptureException = jest.requireMock("@sentry/browser")
    .captureException as jest.Mock;

  const localStore: DataStorageAccess = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  } as unknown as DataStorageAccess;

  const sessionStore = {} as any;

  beforeEach(() => {
    jest.resetAllMocks();
    (localStore.getItem as jest.Mock).mockImplementation(async (key) => {
      if (key === NETWORK_ID) {
        return {
          ...DEFAULT_NETWORKS[1],
          network: "testnet",
          networkName: "Testnet",
        };
      }
      return undefined;
    });
  });

  it("returns true without calling callBackendV2 for custom networks", async () => {
    mockIsCustomNetwork.mockReturnValue(true);

    const result = await getIsRpcHealthy({ localStore, sessionStore });

    expect(result).toBe(true);
    expect(mockedCallBackendV2).not.toHaveBeenCalled();
  });

  it("routes rpc-health through callBackendV2 and returns true when healthy", async () => {
    mockIsCustomNetwork.mockReturnValue(false);
    mockedCallBackendV2.mockResolvedValue({
      status: 200,
      body: { status: "healthy" },
    });

    const result = await getIsRpcHealthy({ localStore, sessionStore });

    expect(mockedCallBackendV2).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        path: expect.stringContaining("/rpc-health?network="),
        sessionStore,
        localStore,
        // rpc-health is never auth-gated — it must skip the JWT/keypair.
        skipAuth: true,
      }),
    );
    expect(result).toBe(true);
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("returns false and captures when callBackendV2 returns non-200", async () => {
    mockIsCustomNetwork.mockReturnValue(false);
    mockedCallBackendV2.mockResolvedValue({
      status: 503,
      body: null,
    });

    const result = await getIsRpcHealthy({ localStore, sessionStore });

    expect(result).toBe(false);
    expect(mockCaptureException).toHaveBeenCalledWith(
      "Failed to load rpc health for Soroban",
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      "Soroban RPC is not healthy - unhealthy",
    );
  });

  it("returns false and captures when rpc health body indicates unhealthy", async () => {
    mockIsCustomNetwork.mockReturnValue(false);
    mockedCallBackendV2.mockResolvedValue({
      status: 200,
      body: { status: "unhealthy" },
    });

    const result = await getIsRpcHealthy({ localStore, sessionStore });

    expect(result).toBe(false);
    expect(mockCaptureException).toHaveBeenCalledWith(
      "Soroban RPC is not healthy - unhealthy",
    );
  });
});

describe("allowlist updates", () => {
  const PUBLIC_KEY = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
  const networkDetails = { ...DEFAULT_NETWORKS[1], networkName: "Testnet" };

  // Yields between each read and write, so concurrent updates interleave
  // unless they're serialized.
  const makeSlowStore = (allowList: Record<string, unknown>) => {
    const data: Record<string, unknown> = { [ALLOWLIST_ID]: allowList };
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    return {
      data,
      store: {
        getItem: async (key: string) => {
          await tick();
          return data[key];
        },
        setItem: async (key: string, value: unknown) => {
          await tick();
          data[key] = value;
        },
      } as unknown as DataStorageAccess,
    };
  };

  it("applies concurrent removals without losing either", async () => {
    const { data, store } = makeSlowStore({
      Testnet: { [PUBLIC_KEY]: ["a.com", "b.com", "c.com"] },
    });

    await Promise.all([
      removeAllowListDomain({
        publicKey: PUBLIC_KEY,
        networkName: "Testnet",
        domain: "a.com",
        localStore: store,
      }),
      removeAllowListDomain({
        publicKey: PUBLIC_KEY,
        networkName: "Testnet",
        domain: "b.com",
        localStore: store,
      }),
    ]);

    expect(data[ALLOWLIST_ID]).toEqual({
      Testnet: { [PUBLIC_KEY]: ["c.com"] },
    });
  });

  it("applies a concurrent removal and grant without losing either", async () => {
    const { data, store } = makeSlowStore({
      Testnet: { [PUBLIC_KEY]: ["a.com"] },
    });

    await Promise.all([
      removeAllowListDomain({
        publicKey: PUBLIC_KEY,
        networkName: "Testnet",
        domain: "a.com",
        localStore: store,
      }),
      setAllowListDomain({
        publicKey: PUBLIC_KEY,
        networkDetails,
        domain: "b.com",
        localStore: store,
      }),
    ]);

    expect(data[ALLOWLIST_ID]).toEqual({
      Testnet: { [PUBLIC_KEY]: ["b.com"] },
    });
  });

  it("runs the next update after a failed one", async () => {
    const { data, store } = makeSlowStore({
      Testnet: { [PUBLIC_KEY]: ["a.com"] },
    });
    const failingStore = {
      ...store,
      getItem: () => Promise.reject(new Error("storage failure")),
    } as unknown as DataStorageAccess;

    const failed = removeAllowListDomain({
      publicKey: PUBLIC_KEY,
      networkName: "Testnet",
      domain: "a.com",
      localStore: failingStore,
    });
    const succeeded = removeAllowListDomain({
      publicKey: PUBLIC_KEY,
      networkName: "Testnet",
      domain: "a.com",
      localStore: store,
    });

    await expect(failed).rejects.toThrow("storage failure");
    await succeeded;
    expect(data[ALLOWLIST_ID]).toEqual({ Testnet: { [PUBLIC_KEY]: [] } });
  });
});
