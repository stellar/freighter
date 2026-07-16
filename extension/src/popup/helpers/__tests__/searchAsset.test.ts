import { searchAsset } from "../searchAsset";
import { NetworkDetails } from "@shared/constants/stellar";

const MAINNET: NetworkDetails = {
  network: "PUBLIC",
  networkName: "Main Net",
  networkUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  sorobanRpcUrl: "https://soroban.stellar.org",
} as NetworkDetails;

describe("searchAsset", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns the parsed body on a 2xx response", async () => {
    const body = { _embedded: { records: [{ asset: "USDC-GUSD" }] } };
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => body,
    } as unknown as Response);

    const result = await searchAsset({
      asset: "usdc",
      networkDetails: MAINNET,
    });
    expect(result).toEqual(body);
  });

  it("throws on a non-ok response instead of returning a non-records body", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      statusText: "Bad Gateway",
      json: async () => ({ error: "upstream" }),
    } as unknown as Response);

    await expect(
      searchAsset({ asset: "usdc", networkDetails: MAINNET }),
    ).rejects.toThrow("Bad Gateway");
  });
});
