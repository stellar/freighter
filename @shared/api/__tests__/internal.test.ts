import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as GetLedgerKeyAccounts from "../helpers/getLedgerKeyAccounts";
import * as internalApi from "../internal";

describe("internalApi", () => {
  describe("getAssetDomains", () => {
    it("should return a list of domains from a list of issuers", async () => {
      jest
        .spyOn(GetLedgerKeyAccounts, "getLedgerKeyAccounts")
        .mockResolvedValue({
          G1: {
            account_id: "G1",
            home_domain: "stellar1.org",
            balance: "1000000000000000000",
            seq_num: 1,
            num_sub_entries: 1,
            inflation_dest: "G1",
            flags: 1,
            thresholds: "1000000000000000000",
            signers: [{ key: "G1", weight: 1 }],
            sequence_number: 1,
          },
          G2: {
            account_id: "G2",
            home_domain: "stellar2.org",
            balance: "1000000000000000000",
            seq_num: 1,
            num_sub_entries: 1,
            inflation_dest: "G2",
            flags: 1,
            thresholds: "1000000000000000000",
            signers: [{ key: "G2", weight: 1 }],
            sequence_number: 1,
          },
        });
      const assetDomains = await internalApi.getAssetDomains({
        assetIssuerDomainsToFetch: ["G1", "G2"],
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
  });
});
