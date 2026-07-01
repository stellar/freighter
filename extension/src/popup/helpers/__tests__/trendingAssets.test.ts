import {
  fetchTrendingAssets,
  MIN_TRENDING_VOLUME7D,
  TRENDING_LIMIT,
} from "../trendingAssets";
import { NetworkDetails } from "@shared/constants/stellar";

const MAINNET: NetworkDetails = {
  network: "PUBLIC",
  networkName: "Main Net",
  networkUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  sorobanRpcUrl: "https://soroban.stellar.org",
} as NetworkDetails;

const TESTNET: NetworkDetails = {
  network: "TESTNET",
  networkName: "Test Net",
  networkUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
} as NetworkDetails;

const recordsResponse = (
  records: { asset: string; volume7d: number; domain?: string }[],
) => ({
  json: async () => ({ _embedded: { records } }),
  ok: true,
});

describe("fetchTrendingAssets", () => {
  afterEach(() => jest.restoreAllMocks());

  it("hits the volume7d-sorted endpoint with limit=50 on mainnet", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        recordsResponse([
          { asset: "AQUA-GBNZ", volume7d: MIN_TRENDING_VOLUME7D + 1 },
        ]) as unknown as Response,
      );

    await fetchTrendingAssets({ networkDetails: MAINNET });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("api.stellar.expert/explorer/public/asset");
    expect(calledUrl).toContain("sort=volume7d");
    expect(calledUrl).toContain("order=desc");
    expect(calledUrl).toContain(`limit=${TRENDING_LIMIT}`);
  });

  it("omits sort/order params on testnet", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        recordsResponse([
          { asset: "USDC-GTEST", volume7d: 0 },
        ]) as unknown as Response,
      );

    await fetchTrendingAssets({ networkDetails: TESTNET });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("api.stellar.expert/explorer/testnet/asset");
    expect(calledUrl).not.toContain("sort=volume7d");
    expect(calledUrl).not.toContain("order=desc");
    expect(calledUrl).toContain(`limit=${TRENDING_LIMIT}`);
  });

  it("drops mainnet records below the volume floor", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      recordsResponse([
        { asset: "BIG-GBIG", volume7d: MIN_TRENDING_VOLUME7D + 5 },
        { asset: "SMALL-GSMALL", volume7d: MIN_TRENDING_VOLUME7D - 5 },
      ]) as unknown as Response,
    );

    const result = await fetchTrendingAssets({ networkDetails: MAINNET });

    expect(result.map((r) => r.code)).toEqual(["BIG"]);
    expect(result[0].issuer).toBe("GBIG");
  });

  it("keeps every testnet record regardless of volume (floor is a no-op)", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      recordsResponse([
        { asset: "A-GA", volume7d: 0 },
        { asset: "B-GB", volume7d: 0 },
      ]) as unknown as Response,
    );

    const result = await fetchTrendingAssets({ networkDetails: TESTNET });
    expect(result.map((r) => r.code)).toEqual(["A", "B"]);
  });

  it("propagates the error when the fetch rejects (so the picker can flag discovery-down)", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    await expect(
      fetchTrendingAssets({ networkDetails: MAINNET }),
    ).rejects.toThrow("network down");
  });

  it("throws on a non-ok response instead of returning []", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      statusText: "Service Unavailable",
      json: async () => ({}),
    } as unknown as Response);
    await expect(
      fetchTrendingAssets({ networkDetails: MAINNET }),
    ).rejects.toThrow("Service Unavailable");
  });
});
