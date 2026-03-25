import { getIsRpcHealthy } from "../account";
import { NETWORK_ID } from "constants/localStorageTypes";
import { DEFAULT_NETWORKS } from "@shared/constants/stellar";
import type { DataStorageAccess } from "background/helpers/dataStorageAccess";

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
  const mockFetch = jest.fn();
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

  beforeEach(() => {
    jest.resetAllMocks();
    (global as any).fetch = mockFetch;
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

  it("returns true without calling fetch for custom networks", async () => {
    mockIsCustomNetwork.mockReturnValue(true);

    const result = await getIsRpcHealthy(localStore);

    expect(result).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns true when rpc health is healthy", async () => {
    mockIsCustomNetwork.mockReturnValue(false);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "healthy" }),
    });

    const result = await getIsRpcHealthy(localStore);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3003/api/v1/rpc-health?network=testnet",
    );
    expect(result).toBe(true);
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("returns false and captures when rpc health is unhealthy", async () => {
    mockIsCustomNetwork.mockReturnValue(false);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "unhealthy" }),
    });

    const result = await getIsRpcHealthy(localStore);

    expect(result).toBe(false);
    expect(mockCaptureException).toHaveBeenCalledWith(
      "Soroban RPC is not healthy - unhealthy",
    );
  });
});
