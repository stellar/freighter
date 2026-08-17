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

  // Regression: the verdict used to be matched back by re-parsing the returned
  // id (`assetId.replace("-", ":")`), which consumed the first hyphen. A symbol
  // containing one split in the wrong place, the lookup missed, and the verdict
  // was dropped — and because every entry is pre-stamped benign, that renders a
  // malicious token as affirmatively safe.
  it("applies the verdict to a token whose symbol contains a hyphen", async () => {
    const hyphenated = {
      isFunded: true,
      subentryCount: 0,
      balances: {
        "MY-TOKEN:CTOKEN456": {
          token: { code: "MY-TOKEN", issuer: { key: "CTOKEN456" } },
          contractId: "CTOKEN456",
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
      },
    } as any;

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: { results: { "MY-TOKEN-CTOKEN456": maliciousResult } },
      }),
    });

    const result = await addBlockaidScanResults(
      hyphenated,
      MAINNET_NETWORK_DETAILS,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(new URL(url).searchParams.getAll("asset_ids")).toEqual([
      "MY-TOKEN-CTOKEN456",
    ]);
    expect(
      (result.balances!["MY-TOKEN:CTOKEN456"] as any).blockaidData,
    ).toEqual(maliciousResult);
  });

  // Two distinct keys can produce the same Blockaid id, so the id must map to
  // every key behind it — otherwise one of them keeps the benign default.
  it("stamps every balance key that collapses onto the same Blockaid id", async () => {
    const colliding = {
      isFunded: true,
      subentryCount: 0,
      balances: {
        "A-B:C123": {
          token: { code: "A-B", issuer: { key: "C123" } },
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
        "A:B-C123": {
          token: { code: "A", issuer: { key: "B-C123" } },
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
      },
    } as any;

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: { results: { "A-B-C123": maliciousResult } },
      }),
    });

    const result = await addBlockaidScanResults(
      colliding,
      MAINNET_NETWORK_DETAILS,
    );

    expect((result.balances!["A-B:C123"] as any).blockaidData).toEqual(
      maliciousResult,
    );
    expect((result.balances!["A:B-C123"] as any).blockaidData).toEqual(
      maliciousResult,
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
