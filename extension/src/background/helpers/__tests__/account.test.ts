import { getIsRpcHealthy } from "../account";
import { NETWORK_ID } from "constants/localStorageTypes";
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
