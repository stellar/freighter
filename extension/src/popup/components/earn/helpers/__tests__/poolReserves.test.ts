import { BlendCatalogPool, BlendCatalogReserve } from "@shared/api/types/blend";

import { getAcceptedReserves } from "../poolReserves";

const reserve = (assetId: string, enabled: boolean): BlendCatalogReserve => ({
  assetId,
  symbol: assetId,
  name: null,
  decimals: 7,
  enabled,
  utilization: null,
  supplyApy: null,
  borrowApy: null,
  emissionsSupplyApr: null,
  suppliedUsd: null,
  borrowedUsd: null,
  priceUsd: null,
});

const pool = (reserves: BlendCatalogReserve[]): BlendCatalogPool => ({
  id: "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD",
  name: "Fixed",
  status: "ACTIVE",
  suppliedUsd: null,
  borrowedUsd: null,
  interestApy: null,
  netApy: null,
  backstopUsd: null,
  reserves,
});

describe("getAcceptedReserves", () => {
  it("drops the reserves Blend would reject a deposit into", () => {
    const result = getAcceptedReserves(
      pool([
        reserve("XLM", true),
        reserve("EURC", false),
        reserve("USDC", true),
      ]),
    );

    expect(result.map((r) => r.assetId)).toEqual(["XLM", "USDC"]);
  });

  it("keeps the catalog's order for an all enabled pool", () => {
    const reserves = [reserve("XLM", true), reserve("USDC", true)];

    expect(getAcceptedReserves(pool(reserves))).toEqual(reserves);
  });

  it("returns nothing when every reserve is disabled", () => {
    expect(
      getAcceptedReserves(
        pool([reserve("XLM", false), reserve("USDC", false)]),
      ),
    ).toEqual([]);
  });

  // The sheet's pool is null until the catalog resolves, and the icon hook runs
  // against the same value.
  it("returns nothing for a pool that has not loaded", () => {
    expect(getAcceptedReserves(null)).toEqual([]);
  });
});
