import { Networks } from "stellar-sdk";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import * as GetLedgerKeyAccounts from "../helpers/getLedgerKeyAccounts";
import * as internalApi from "../internal";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

describe("internalApi", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe("getAssetDomains", () => {
    it("should return a list of domains from a list of issuers", async () => {
      jest
        .spyOn(GetLedgerKeyAccounts, "getLedgerKeyAccounts")
        .mockResolvedValue({
          G1: {
            account_id:
              "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
            home_domain: "stellar1.org",
            balance: "1000000000000000000",
            seq_num: 1,
            num_sub_entries: 1,
            inflation_dest: "G1",
            flags: 1,
            thresholds: "1000000000000000000",
            signers: [
              {
                key: "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                weight: 1,
              },
            ],
            sequence_number: 1,
          },
          G2: {
            account_id:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
            home_domain: "stellar2.org",
            balance: "1000000000000000000",
            seq_num: 1,
            num_sub_entries: 1,
            inflation_dest:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
            flags: 1,
            thresholds: "1000000000000000000",
            signers: [
              {
                key: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
                weight: 1,
              },
            ],
            sequence_number: 1,
          },
        });
      const assetDomains = await internalApi.getAssetDomains({
        assetIssuerDomainsToFetch: [
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
          "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
        ],
        networkDetails: TESTNET_NETWORK_DETAILS,
      });

      expect(assetDomains).toEqual({
        G1: "stellar1.org",
        G2: "stellar2.org",
      });
    });
    it("should return an empty object if the fetch fails", async () => {
      jest
        .spyOn(GetLedgerKeyAccounts, "getLedgerKeyAccounts")
        .mockRejectedValue(new Error("Fetch failed"));
      const assetDomains = await internalApi.getAssetDomains({
        assetIssuerDomainsToFetch: ["G1", "G2"],
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      expect(assetDomains).toEqual({});
    });
    it("should return an empty object if not valid public keys are provided", async () => {
      const getLedgerKeyAccountsSpy = jest.spyOn(
        GetLedgerKeyAccounts,
        "getLedgerKeyAccounts",
      );
      const assetDomains = await internalApi.getAssetDomains({
        assetIssuerDomainsToFetch: [
          "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
        ],
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      expect(getLedgerKeyAccountsSpy).not.toHaveBeenCalled();
      expect(assetDomains).toEqual({});
    });
  });

  describe("simulateTokenTransfer", () => {
    it("includes the fee in stroops in the indexer request body", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          preparedTransaction: "prepared-xdr",
          simulationResponse: { minResourceFee: "100" },
        }),
      } as unknown as Response);

      await internalApi.simulateTokenTransfer({
        address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
        publicKey: "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
        memo: "memo",
        params: {
          publicKey: "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
          destination:
            "GDQP2KPQGKIHYJGXNUIYOMHARUARCA6JYB6CYH6ZJQ4Q25PDBLQZKK7L",
          amount: 1,
        },
        networkDetails: TESTNET_NETWORK_DETAILS,
        transactionFee: "0.00001",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/simulate-token-transfer"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
            pub_key: "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
            memo: "memo",
            fee: "100",
            params: {
              publicKey:
                "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
              destination:
                "GDQP2KPQGKIHYJGXNUIYOMHARUARCA6JYB6CYH6ZJQ4Q25PDBLQZKK7L",
              amount: 1,
            },
            network_passphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
          }),
        }),
      );
    });
  });

  describe("getTokenPrices request payload filtering", () => {
    // The v2 path routes through the FETCH_BACKEND_V2 background chokepoint
    // (#2879), so it goes through sendMessageToBackground, not a direct fetch.
    const mockSendOk = () =>
      mockedSend.mockResolvedValue({ status: 200, body: { data: {} } });

    const sentMessage = () => mockedSend.mock.calls[0][0];

    it("excludes contract-ID issuers from the indexer request", async () => {
      mockSendOk();

      await internalApi.getTokenPrices(
        [
          "native",
          "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
      );

      const body = JSON.parse(sentMessage().body as string);
      expect(body.tokens).toEqual([
        "native",
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      ]);
    });

    it("excludes liquidity-pool IDs from the indexer request", async () => {
      mockSendOk();

      await internalApi.getTokenPrices(
        ["native", "abc123:lp"],
        MAINNET_NETWORK_DETAILS,
      );

      const body = JSON.parse(sentMessage().body as string);
      expect(body.tokens).toEqual(["native"]);
    });

    it("targets the v2 chokepoint with the network query param", async () => {
      mockSendOk();

      await internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS);

      const message = sentMessage();
      expect(message.type).toBe(SERVICE_TYPES.FETCH_BACKEND_V2);
      expect(message.method).toBe("POST");
      expect(message.path).toContain("/token-prices");
      expect(message.path).toContain("network=TESTNET");
    });

    it("derives the price network from the passphrase for custom networks", async () => {
      mockSendOk();

      // Custom network stored as STANDALONE but sharing the pubnet passphrase
      // must still resolve to PUBLIC and hit the endpoint.
      await internalApi.getTokenPrices(["native"], {
        ...MAINNET_NETWORK_DETAILS,
        network: "STANDALONE",
        networkName: "Custom Pubnet",
        networkPassphrase: Networks.PUBLIC,
      });

      expect(mockedSend).toHaveBeenCalled();
      expect(sentMessage().path).toContain("network=PUBLIC");
    });

    it("skips the request on unsupported networks", async () => {
      mockSendOk();

      const prices = await internalApi.getTokenPrices(
        ["native"],
        FUTURENET_NETWORK_DETAILS,
      );

      expect(mockedSend).not.toHaveBeenCalled();
      expect(prices).toEqual({});
    });

    it("skips the request when every token is filtered out", async () => {
      mockSendOk();

      const prices = await internalApi.getTokenPrices(
        [
          "abc123:lp",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
      );

      expect(mockedSend).not.toHaveBeenCalled();
      expect(prices).toEqual({});
    });
  });

  describe("getTokenPrices v2 response handling", () => {
    it("returns the price data from a 200 response", async () => {
      const prices = { native: { usd: "1", usdDelta24hPct: "0" } };
      mockedSend.mockResolvedValue({ status: 200, body: { data: prices } });

      const result = await internalApi.getTokenPrices(
        ["native"],
        TESTNET_NETWORK_DETAILS,
      );

      expect(result).toEqual(prices);
    });

    it("throws on a non-200 response", async () => {
      mockedSend.mockResolvedValue({ status: 500, body: null });

      await expect(
        internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS),
      ).rejects.toThrow();
    });

    it("throws when a 200 response is missing its data payload", async () => {
      // A 200 without `data` must throw, not resolve to undefined — otherwise
      // undefined flows into the price cache/UI.
      mockedSend.mockResolvedValue({ status: 200, body: {} });

      await expect(
        internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS),
      ).rejects.toThrow();
    });
  });

  describe("getTokenPrices v1 endpoint (useV2 = false)", () => {
    const mockFetchOk = () =>
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: {} }),
      } as unknown as Response);

    it("targets the v1 endpoint without a network query param", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        ["native"],
        TESTNET_NETWORK_DETAILS,
        false,
      );

      const requestUrl = fetchSpy.mock.calls[0][0] as string;
      expect(requestUrl).toContain("/token-prices");
      expect(requestUrl).not.toContain("network=");
    });

    it("still filters LP IDs and contract-ID issuers from the request", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        [
          "native",
          "abc123:lp",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
        false,
      );

      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);
      expect(body.tokens).toEqual(["native"]);
    });

    it("does NOT skip unsupported networks (unlike v2)", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        ["native"],
        FUTURENET_NETWORK_DETAILS,
        false,
      );

      expect(fetchSpy).toHaveBeenCalled();
    });

    it("does NOT skip when every token is filtered out (unlike v2)", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        [
          "abc123:lp",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
        false,
      );

      expect(fetchSpy).toHaveBeenCalled();
      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);
      expect(body.tokens).toEqual([]);
    });
  });

  describe("getDiscoverData", () => {
    it("fetches /protocols via the FETCH_BACKEND_V2 message", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: {
          data: {
            protocols: [
              {
                description: "d",
                icon_url: "i",
                name: "n",
                website_url: "w",
                tags: ["t"],
                is_blacklisted: false,
                is_trending: true,
              },
            ],
          },
        },
      });

      const result = await internalApi.getDiscoverData();

      expect(mockedSend).toHaveBeenCalledWith({
        type: SERVICE_TYPES.FETCH_BACKEND_V2,
        activePublicKey: null,
        method: "GET",
        path: "/protocols",
      });
      expect(result[0]).toMatchObject({
        name: "n",
        iconUrl: "i",
        isTrending: true,
      });
    });
  });
});
