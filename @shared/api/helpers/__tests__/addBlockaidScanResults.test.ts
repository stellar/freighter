import BigNumber from "bignumber.js";

import { addBlockaidScanResults } from "../addBlockaidScanResults";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { AccountBalancesInterface } from "../../types/backend-api";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const makeBalances = (): AccountBalancesInterface =>
  ({
    isFunded: true,
    subentryCount: 1,
    balances: {
      native: {
        token: { type: "native", code: "XLM" },
        total: new BigNumber("100"),
        available: new BigNumber("98"),
      },
      "USDC:GISSUER": {
        token: {
          type: "credit_alphanum4",
          code: "USDC",
          issuer: { key: "GISSUER" },
        },
        total: new BigNumber("50"),
        available: new BigNumber("50"),
      },
      "TKN:CTOKEN456": {
        token: { code: "TKN", issuer: { key: "CTOKEN456" } },
        contractId: "CTOKEN456",
        total: new BigNumber("5"),
        available: new BigNumber("5"),
      },
      "abc123poolid:lp": {
        liquidityPoolId: "abc123poolid",
        total: new BigNumber("12"),
        available: new BigNumber("12"),
      },
    },
  }) as any;

const maliciousResult = {
  ...defaultBlockaidScanAssetResult,
  result_type: "Malicious",
};

const mockFetch = jest.fn();

describe("addBlockaidScanResults", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
  });

  it("stamps the benign default on every entry without fetching on non-PUBLIC networks", async () => {
    const result = await addBlockaidScanResults(
      makeBalances(),
      TESTNET_NETWORK_DETAILS,
    );

    expect(mockFetch).not.toHaveBeenCalled();
    for (const key of Object.keys(result.balances!)) {
      expect((result.balances![key] as any).blockaidData).toEqual(
        defaultBlockaidScanAssetResult,
      );
    }
  });

  it("skips the scan (but keeps defaults) when shouldSkipScan is true", async () => {
    const result = await addBlockaidScanResults(
      makeBalances(),
      MAINNET_NETWORK_DETAILS,
      true,
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect((result.balances!["USDC:GISSUER"] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
  });

  it("scans classic + Soroban ids (not native/LP) on PUBLIC and merges results", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: { results: { "USDC-GISSUER": maliciousResult } },
      }),
    });

    const result = await addBlockaidScanResults(
      makeBalances(),
      MAINNET_NETWORK_DETAILS,
    );

    const [url] = mockFetch.mock.calls[0];
    const requested = new URL(url).searchParams.getAll("asset_ids");
    expect(requested).toEqual(["USDC-GISSUER", "TKN-CTOKEN456"]);

    // matched entry overwritten with the scan verdict
    expect((result.balances!["USDC:GISSUER"] as any).blockaidData).toEqual(
      maliciousResult,
    );
    // unmatched + unscannable entries keep the benign default
    expect((result.balances!["TKN:CTOKEN456"] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
    expect((result.balances!.native as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
    expect((result.balances!["abc123poolid:lp"] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
  });

  it("keeps benign defaults when the scan request fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("scan down"));

    const result = await addBlockaidScanResults(
      makeBalances(),
      MAINNET_NETWORK_DETAILS,
    );

    expect((result.balances!["USDC:GISSUER"] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
  });

  it("does not fetch when there is nothing scannable", async () => {
    const onlyNative = {
      isFunded: true,
      subentryCount: 0,
      balances: {
        native: { total: new BigNumber("1"), available: new BigNumber("1") },
      },
    } as any;

    await addBlockaidScanResults(onlyNative, MAINNET_NETWORK_DETAILS);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
