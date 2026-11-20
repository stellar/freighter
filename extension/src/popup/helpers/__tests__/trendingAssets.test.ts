import {
  fetchTrendingAssets,
  MIN_TRENDING_VOLUME7D,
  TRENDING_LIMIT,
} from "../trendingAssets";
import { NetworkDetails } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

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

const respondWithRecords = (
  records: {
    asset: string;
    volume7d: number;
    domain?: string;
    code?: string;
    decimals?: number;
  }[],
) =>
  mockedSend.mockResolvedValue({
    status: 200,
    body: { data: { _embedded: { records } } },
  });

const requestedPath = () => mockedSend.mock.calls[0][0].path as string;

describe("fetchTrendingAssets", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("asks freighter-backend-v2 for the volume7d-sorted list on mainnet, never StellarExpert directly", async () => {
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("direct fetch"));
    respondWithRecords([
      { asset: "AQUA-GBNZ", volume7d: MIN_TRENDING_VOLUME7D + 1 },
    ]);

    await fetchTrendingAssets({ networkDetails: MAINNET });

    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SERVICE_TYPES.FETCH_BACKEND_V2,
        method: "GET",
      }),
    );
    expect(requestedPath()).toBe(
      `/assets/search?network=PUBLIC&sort=volume7d&order=desc&limit=${TRENDING_LIMIT}`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("omits sort/order params on testnet", async () => {
    respondWithRecords([{ asset: "USDC-GTEST", volume7d: 0 }]);

    await fetchTrendingAssets({ networkDetails: TESTNET });

    expect(requestedPath()).toBe(
      `/assets/search?network=TESTNET&limit=${TRENDING_LIMIT}`,
    );
  });

  it("drops mainnet records below the volume floor", async () => {
    respondWithRecords([
      { asset: "BIG-GBIG", volume7d: MIN_TRENDING_VOLUME7D + 5 },
      { asset: "SMALL-GSMALL", volume7d: MIN_TRENDING_VOLUME7D - 5 },
    ]);

    const result = await fetchTrendingAssets({ networkDetails: MAINNET });

    expect(result.map((r) => r.code)).toEqual(["BIG"]);
    expect(result[0].issuer).toBe("GBIG");
  });

  it("keeps Soroban contract tokens, by contract ID and with their decimals", async () => {
    const contract = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";
    respondWithRecords([
      {
        asset: contract,
        code: "TKN",
        decimals: 6,
        volume7d: MIN_TRENDING_VOLUME7D + 5,
      },
    ]);

    const result = await fetchTrendingAssets({ networkDetails: MAINNET });

    expect(result).toEqual([
      expect.objectContaining({
        code: "TKN",
        issuer: contract,
        contract,
        decimals: 6,
      }),
    ]);
  });

  it("names a contract token with no code by its shortened contract ID", async () => {
    const contract = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";
    respondWithRecords([
      { asset: contract, decimals: 7, volume7d: MIN_TRENDING_VOLUME7D + 5 },
    ]);

    const [token] = await fetchTrendingAssets({ networkDetails: MAINNET });

    expect(token.code).toBe("CBI7…IHRV");
  });

  it("keeps every testnet record regardless of volume (floor is a no-op)", async () => {
    respondWithRecords([
      { asset: "A-GA", volume7d: 0 },
      { asset: "B-GB", volume7d: 0 },
    ]);

    const result = await fetchTrendingAssets({ networkDetails: TESTNET });
    expect(result.map((r) => r.code)).toEqual(["A", "B"]);
  });

  it("propagates the error when the request rejects (so the picker can flag discovery-down)", async () => {
    mockedSend.mockRejectedValue(new Error("network down"));
    await expect(
      fetchTrendingAssets({ networkDetails: MAINNET }),
    ).rejects.toThrow("network down");
  });

  it("throws on a non-200 response instead of returning []", async () => {
    mockedSend.mockResolvedValue({
      status: 503,
      body: { error: "asset search temporarily unavailable" },
    });
    await expect(
      fetchTrendingAssets({ networkDetails: MAINNET }),
    ).rejects.toThrow("503");
  });
});
