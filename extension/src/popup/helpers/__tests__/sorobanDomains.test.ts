import { NetworkDetails } from "@shared/constants/stellar";
import { resolveSorobanDomain } from "../sorobanDomains";

const mockSearchDomain = jest.fn();

jest.mock("@creit-tech/sorobandomains-sdk", () => ({
  SorobanDomainsSDK: jest.fn().mockImplementation(() => ({
    searchDomain: mockSearchDomain,
  })),
}));
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

const MAINNET: NetworkDetails = {
  network: "PUBLIC",
  networkName: "Main Net",
  networkUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  sorobanRpcUrl: "https://mainnet-rpc.example.com",
} as NetworkDetails;

describe("resolveSorobanDomain", () => {
  beforeEach(() => {
    mockSearchDomain.mockReset();
  });

  it("resolves a domain to its address", async () => {
    mockSearchDomain.mockResolvedValue({
      address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    });

    const result = await resolveSorobanDomain("jhon.xlm", MAINNET);

    expect(result).toEqual({
      address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      domain: "jhon.xlm",
    });
    expect(mockSearchDomain).toHaveBeenCalledWith("jhon.xlm");
  });

  it("lowercases the domain before resolving", async () => {
    mockSearchDomain.mockResolvedValue({
      address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    });

    await resolveSorobanDomain("Jhon.Xlm", MAINNET);

    expect(mockSearchDomain).toHaveBeenCalledWith("jhon.xlm");
  });

  it("accepts a resolved contract (C...) address", async () => {
    mockSearchDomain.mockResolvedValue({
      address: "CDZLVHOI3URJNQB5R4ES5OE5K6CVIEP7DZFYQU7H3DD5W7WIJBGJAPPA",
    });

    const result = await resolveSorobanDomain("jhon.xlm", MAINNET);

    expect(result.address).toBe(
      "CDZLVHOI3URJNQB5R4ES5OE5K6CVIEP7DZFYQU7H3DD5W7WIJBGJAPPA",
    );
  });

  it("throws a generic translated error when the domain doesn't exist", async () => {
    mockSearchDomain.mockRejectedValue(new Error("Domain doesn't exist"));

    await expect(resolveSorobanDomain("nope.xlm", MAINNET)).rejects.toThrow(
      "Failed to resolve Soroban Domain",
    );
  });

  it("throws a generic translated error when the registry returns an invalid address", async () => {
    mockSearchDomain.mockResolvedValue({ address: "not-a-valid-address" });

    await expect(resolveSorobanDomain("jhon.xlm", MAINNET)).rejects.toThrow(
      "Failed to resolve Soroban Domain",
    );
  });

  it("throws a generic translated error when no Soroban RPC is configured", async () => {
    const noRpc = { ...MAINNET, sorobanRpcUrl: "" };

    await expect(resolveSorobanDomain("jhon.xlm", noRpc)).rejects.toThrow(
      "Failed to resolve Soroban Domain",
    );
    expect(mockSearchDomain).not.toHaveBeenCalled();
  });

  it("reports failures to Sentry", async () => {
    const { captureException } = jest.requireMock("@sentry/browser");
    mockSearchDomain.mockRejectedValue(new Error("boom"));

    await expect(resolveSorobanDomain("jhon.xlm", MAINNET)).rejects.toThrow();

    expect(captureException).toHaveBeenCalled();
  });
});
