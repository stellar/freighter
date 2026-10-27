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

// Real keys: ids without a valid G or C issuer are left out of the scan.
const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CONTRACT = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const USDC_KEY = `USDC:${ISSUER}`;
const TKN_KEY = `TKN:${CONTRACT}`;

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
      [USDC_KEY]: {
        token: {
          type: "credit_alphanum4",
          code: "USDC",
          issuer: { key: ISSUER },
        },
        total: new BigNumber("50"),
        available: new BigNumber("50"),
      },
      [TKN_KEY]: {
        token: { code: "TKN", issuer: { key: CONTRACT } },
        contractId: CONTRACT,
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
    expect((result.balances![USDC_KEY] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
  });

  it("scans classic + Soroban ids (not native/LP) on PUBLIC and merges results", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: { results: { [`USDC-${ISSUER}`]: maliciousResult } },
      }),
    });

    const result = await addBlockaidScanResults(
      makeBalances(),
      MAINNET_NETWORK_DETAILS,
    );

    const [url] = mockFetch.mock.calls[0];
    const requested = new URL(url).searchParams.getAll("asset_ids");
    expect(requested).toEqual([`USDC-${ISSUER}`, `TKN-${CONTRACT}`]);

    // matched entry overwritten with the scan verdict
    expect((result.balances![USDC_KEY] as any).blockaidData).toEqual(
      maliciousResult,
    );
    // unmatched + unscannable entries keep the benign default
    expect((result.balances![TKN_KEY] as any).blockaidData).toEqual(
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

    expect((result.balances![USDC_KEY] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
  });

  // freighter-backend rejects the whole /scan-asset-bulk request when one id's
  // split("-")[1] isn't a G or C key, so a SEP-41 symbol with a hyphen used to
  // cost every other balance in its chunk its verdict. It's left out instead
  // and keeps the benign default, like an LP share.
  it("leaves out a token whose symbol contains a hyphen so the rest of its chunk keeps its verdicts", async () => {
    const hyphenatedKey = `MY-TOKEN:${CONTRACT}`;
    const balances = {
      isFunded: true,
      subentryCount: 0,
      balances: {
        [USDC_KEY]: {
          token: { code: "USDC", issuer: { key: ISSUER } },
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
        [hyphenatedKey]: {
          token: { code: "MY-TOKEN", issuer: { key: CONTRACT } },
          contractId: CONTRACT,
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
      },
    } as any;

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: { results: { [`USDC-${ISSUER}`]: maliciousResult } },
      }),
    });

    const result = await addBlockaidScanResults(
      balances,
      MAINNET_NETWORK_DETAILS,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(new URL(url).searchParams.getAll("asset_ids")).toEqual([
      `USDC-${ISSUER}`,
    ]);
    expect((result.balances![USDC_KEY] as any).blockaidData).toEqual(
      maliciousResult,
    );
    expect((result.balances![hyphenatedKey] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
  });

  // Blockaid fails the batch the same way on a code it can't take.
  it("leaves out a token whose symbol Blockaid can't take so the rest of its chunk keeps its verdicts", async () => {
    const dottedKey = `USDC.e:${CONTRACT}`;
    const balances = {
      isFunded: true,
      subentryCount: 0,
      balances: {
        [USDC_KEY]: {
          token: { code: "USDC", issuer: { key: ISSUER } },
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
        [dottedKey]: {
          token: { code: "USDC.e", issuer: { key: CONTRACT } },
          contractId: CONTRACT,
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
      },
    } as any;

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: { results: { [`USDC-${ISSUER}`]: maliciousResult } },
      }),
    });

    const result = await addBlockaidScanResults(
      balances,
      MAINNET_NETWORK_DETAILS,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(new URL(url).searchParams.getAll("asset_ids")).toEqual([
      `USDC-${ISSUER}`,
    ]);
    expect((result.balances![USDC_KEY] as any).blockaidData).toEqual(
      maliciousResult,
    );
    expect((result.balances![dottedKey] as any).blockaidData).toEqual(
      defaultBlockaidScanAssetResult,
    );
  });

  it("does not fetch when no held token can be bulk scanned", async () => {
    const balances = {
      isFunded: true,
      subentryCount: 0,
      balances: {
        native: { total: new BigNumber("1"), available: new BigNumber("1") },
        [`MY-TOKEN:${CONTRACT}`]: {
          token: { code: "MY-TOKEN", issuer: { key: CONTRACT } },
          contractId: CONTRACT,
          total: new BigNumber("1"),
          available: new BigNumber("1"),
        },
      },
    } as any;

    await addBlockaidScanResults(balances, MAINNET_NETWORK_DETAILS);

    expect(mockFetch).not.toHaveBeenCalled();
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
