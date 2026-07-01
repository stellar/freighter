import { schemaValidatedAssetList } from "../token-list";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { SEP0042_ASSETLIST_SCHEMA } from "./fixtures/sep0042-assetlist.schema";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

import { captureException } from "@sentry/browser";

const VALID_CONTRACT = `C${"A".repeat(55)}`; // ^C[A-Z0-9]{55}$
const VALID_ISSUER = `G${"A".repeat(55)}`; // ^G[A-Z0-9]{55}$

const baseAsset = (overrides: Record<string, unknown> = {}) => ({
  name: "Test Asset",
  org: "Test Org",
  code: "TEST",
  issuer: VALID_ISSUER,
  contract: VALID_CONTRACT,
  domain: "test.com",
  icon: "https://test.com/icon.png",
  decimals: 7,
  ...overrides,
});

const baseList = (overrides: Record<string, unknown> = {}): AssetListResponse =>
  ({
    name: "Test List",
    provider: "Test Provider",
    description: "A test list",
    version: "1.0",
    network: "public",
    assets: [baseAsset()],
    ...overrides,
  }) as AssetListResponse;

describe("schemaValidatedAssetList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The SEP-0042 schema is fetched over the network; return the fixture
    // so validation is deterministic and offline.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => SEP0042_ASSETLIST_SCHEMA,
    }) as jest.Mock;
  });

  it("accepts 'mainnet' as a network value", async () => {
    const result = await schemaValidatedAssetList(
      baseList({ network: "mainnet" }),
    );
    expect(result.errors).toBeNull();
    expect(result.assets).toHaveLength(1);
  });

  it("accepts a three-segment version", async () => {
    const result = await schemaValidatedAssetList(
      baseList({ version: "1.4.4" }),
    );
    expect(result.errors).toBeNull();
    expect(result.assets).toHaveLength(1);
  });

  it("strips an invalid name but keeps the asset and its other fields", async () => {
    const result = await schemaValidatedAssetList(
      baseList({ assets: [baseAsset({ name: "Carbon tCO₂e offset" })] }),
    );
    expect(result.errors).toBeNull();
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].name).toBeUndefined();
    expect(result.assets[0].code).toBe("TEST");
    expect(result.assets[0].contract).toBe(VALID_CONTRACT);
  });

  it("strips an invalid contract but keeps the asset via code+issuer", async () => {
    const result = await schemaValidatedAssetList(
      baseList({
        assets: [baseAsset({ contract: "deadbeef-not-a-contract" })],
      }),
    );
    expect(result.errors).toBeNull();
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].contract).toBeUndefined();
    expect(result.assets[0].code).toBe("TEST");
    expect(result.assets[0].issuer).toBe(VALID_ISSUER);
  });

  it("tolerates assets missing both name and org", async () => {
    const asset = baseAsset();
    delete (asset as Record<string, unknown>).name;
    delete (asset as Record<string, unknown>).org;
    const result = await schemaValidatedAssetList(
      baseList({ assets: [asset] }),
    );
    expect(result.errors).toBeNull();
    expect(result.assets).toHaveLength(1);
  });

  it("still rejects a list with a non-relaxed violation (bad domain)", async () => {
    const result = await schemaValidatedAssetList(
      baseList({ assets: [baseAsset({ domain: "NOT A DOMAIN!!" })] }),
    );
    expect(result.assets).toHaveLength(0);
    expect(result.errors).not.toBeNull();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("returns empty assets and null errors when the schema cannot be fetched", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    const result = await schemaValidatedAssetList(baseList());
    expect(result.assets).toHaveLength(0);
    expect(result.errors).toBeNull();
    expect(captureException).toHaveBeenCalled();
  });

  it("does not mutate the input list when stripping fields", async () => {
    const list = baseList({
      assets: [baseAsset({ contract: "deadbeef-not-a-contract" })],
    });
    const snapshot = JSON.stringify(list);
    await schemaValidatedAssetList(list);
    expect(JSON.stringify(list)).toBe(snapshot);
  });
});
