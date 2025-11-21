import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as GetLedgerKeyAccounts from "../helpers/getLedgerKeyAccounts";
import * as internalApi from "../internal";

describe("internalApi", () => {
  afterEach(() => {
    jest.clearAllMocks();
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
});
