import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getLedgerKeyAccounts } from "../getLedgerKeyAccounts";

describe("getDomainFromIssuer", () => {
  it("should return a list of domains from a list of issuers", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              ledger_key_accounts: {
                G1: { account_id: "G1", home_domain: "stellar1.org" },
                g2: { account_id: "g2", home_domain: "stellar2.org" },
              },
            },
          }),
      } as any),
    );
    const ledgerKeyAccounts = await getLedgerKeyAccounts({
      accountList: ["G1", "g2"],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      new URL(
        "http://localhost:3003/api/v1/ledger-key/accounts?network=TESTNET",
      ),
      {
        body: '{"public_keys":["G1","g2"]}',
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(ledgerKeyAccounts).toEqual({
      G1: { account_id: "G1", home_domain: "stellar1.org" },
      g2: { account_id: "g2", home_domain: "stellar2.org" },
    });
  });
  it("should return an empty object if the fetch fails", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
      } as any),
    );
    const ledgerKeyAccounts = await getLedgerKeyAccounts({
      accountList: ["G1", "g2"],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      new URL(
        "http://localhost:3003/api/v1/ledger-key/accounts?network=TESTNET",
      ),
      {
        body: '{"public_keys":["G1","g2"]}',
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(ledgerKeyAccounts).toEqual({});
  });

  it("should return an empty object if the fetch returns an error", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ error: "test" }),
      } as any),
    );

    const ledgerKeyAccounts = await getLedgerKeyAccounts({
      accountList: ["G1", "g2"],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      new URL(
        "http://localhost:3003/api/v1/ledger-key/accounts?network=TESTNET",
      ),
      {
        body: '{"public_keys":["G1","g2"]}',
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(ledgerKeyAccounts).toEqual({});
  });
});
