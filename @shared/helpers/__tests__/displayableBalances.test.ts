import { makeDisplayableBalances } from "@shared/helpers/stellar";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const makeAccount = (balances: unknown[]) =>
  ({
    balances,
    subentry_count: balances.length - 1,
    num_sponsored: 0,
    num_sponsoring: 0,
  }) as any;

const nativeBalance = {
  asset_type: "native",
  balance: "100",
  buying_liabilities: "0",
  selling_liabilities: "0",
};

const usdcBalance = {
  asset_type: "credit_alphanum4",
  asset_code: "USDC",
  asset_issuer: ISSUER,
  balance: "5",
  limit: "1000",
  buying_liabilities: "0",
  selling_liabilities: "0",
};

describe("makeDisplayableBalances Blockaid scan", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            results: { [`USDC-${ISSUER}`]: { result_type: "Malicious" } },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("scans the account's trustlines and applies the verdicts", async () => {
    const balances = await makeDisplayableBalances(
      makeAccount([nativeBalance, usdcBalance]),
      true,
    );

    const [url] = fetchSpy.mock.calls[0];
    expect(new URL(String(url)).searchParams.getAll("asset_ids")).toEqual([
      `USDC-${ISSUER}`,
    ]);
    expect(balances[`USDC:${ISSUER}`].blockaidData.result_type).toBe(
      "Malicious",
    );
  });

  // The backend rejects a request with no ids.
  it("doesn't request a scan for an account that only holds XLM", async () => {
    await makeDisplayableBalances(makeAccount([nativeBalance]), true);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
