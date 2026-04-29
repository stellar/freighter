import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as GetLedgerKeyAccounts from "../helpers/getLedgerKeyAccounts";
import * as internalApi from "../internal";

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
          destination: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA6JYB6CYH6ZJQ4Q25PDBLQZKK7L",
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
            address:
              "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
            pub_key:
              "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
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
});
