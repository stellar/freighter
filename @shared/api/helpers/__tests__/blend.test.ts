import {
  getBlendEarnOptions,
  getBlendPools,
  getBlendSuppliedTokens,
} from "../blend";
import { sendMessageToBackground } from "../extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { PUBLIC_SACS } from "@shared/constants/sac";
import { NETWORKS } from "@shared/constants/stellar";

jest.mock("../extensionMessaging");
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

const mockedSend = sendMessageToBackground as jest.Mock;
const networkDetails = { network: "PUBLIC" } as never;

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
const USDC_SAC = PUBLIC_SACS.USDC!;
const XLM_SAC = PUBLIC_SACS.XLM;
const PUBLIC_KEY = "GAX2VVWVHU5YQY5J3NJBXKHI3FFKZN54BE6GRJCWSIKSBZTQWJJNJMPC";

beforeEach(() => {
  mockedSend.mockReset();
});

describe("getBlendEarnOptions", () => {
  it("GETs earn-options with the network in the path", async () => {
    // The query must live in `path` — authedFetch signs pathname + search, so a
    // query appended anywhere downstream would break the JWT signature.
    mockedSend.mockResolvedValue({
      status: 200,
      body: { data: { options: [] } },
    });

    await getBlendEarnOptions({ networkDetails });

    expect(mockedSend).toHaveBeenCalledWith({
      type: SERVICE_TYPES.FETCH_BACKEND_V2,
      activePublicKey: null,
      method: "GET",
      path: "/protocols/blend/earn-options?network=PUBLIC",
    });
  });

  it("maps snake_case wire fields to camelCase", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: {
          options: [
            {
              asset_id: USDC_SAC,
              symbol: "USDC",
              name: "USD Coin",
              decimals: 7,
              pools: [
                {
                  id: POOL_ID,
                  name: "Fixed Pool v2",
                  supply_apy: 0.1694,
                  emissions_supply_apr: null,
                  supplied_usd: 50050000,
                },
              ],
            },
          ],
        },
      },
    });

    expect(await getBlendEarnOptions({ networkDetails })).toEqual([
      {
        assetId: USDC_SAC,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 7,
        pools: [
          {
            id: POOL_ID,
            name: "Fixed Pool v2",
            supplyApy: 0.1694,
            emissionsSupplyApr: null,
            suppliedUsd: 50050000,
          },
        ],
      },
    ]);
  });

  it("preserves the null/zero distinction on rates", async () => {
    // null means "no fresh oracle price"; 0 means the rate really is zero. The
    // UI renders these differently, so coalescing would be a data bug.
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: {
          options: [
            {
              asset_id: XLM_SAC,
              symbol: "XLM",
              name: null,
              decimals: null,
              pools: [
                {
                  id: POOL_ID,
                  name: null,
                  supply_apy: 0,
                  emissions_supply_apr: null,
                  supplied_usd: null,
                },
              ],
            },
          ],
        },
      },
    });

    const [option] = await getBlendEarnOptions({ networkDetails });

    expect(option.decimals).toBeNull();
    expect(option.pools[0].supplyApy).toBe(0);
    expect(option.pools[0].emissionsSupplyApr).toBeNull();
    expect(option.pools[0].suppliedUsd).toBeNull();
  });

  it("throws on a non-200", async () => {
    mockedSend.mockResolvedValue({ status: 500, body: { error: "upstream" } });

    await expect(getBlendEarnOptions({ networkDetails })).rejects.toThrow();
  });

  it("throws on a 200 with no data payload", async () => {
    mockedSend.mockResolvedValue({ status: 200, body: {} });

    await expect(getBlendEarnOptions({ networkDetails })).rejects.toThrow();
  });
});

describe("getBlendPools", () => {
  it("GETs pools with the network in the path", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: { data: { pools: [] } },
    });

    await getBlendPools({ networkDetails });

    expect(mockedSend).toHaveBeenCalledWith({
      type: SERVICE_TYPES.FETCH_BACKEND_V2,
      activePublicKey: null,
      method: "GET",
      path: "/protocols/blend/pools?network=PUBLIC",
    });
  });

  it("maps the pool and its reserves", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: {
          pools: [
            {
              id: POOL_ID,
              name: "Fixed Pool v2",
              status: "ACTIVE",
              supplied_usd: 50050000,
              borrowed_usd: 16150000,
              interest_apy: 0.0424,
              net_apy: 0.1694,
              backstop_usd: 1530000,
              reserves: [
                {
                  asset_id: USDC_SAC,
                  symbol: "USDC",
                  name: "USD Coin",
                  decimals: 7,
                  enabled: true,
                  utilization: 0.32,
                  supply_apy: 0.0424,
                  borrow_apy: 0.09,
                  emissions_supply_apr: null,
                  supplied_usd: 50050000,
                  borrowed_usd: 16150000,
                  price_usd: 1,
                },
              ],
            },
          ],
        },
      },
    });

    const [pool] = await getBlendPools({ networkDetails });

    expect(pool.interestApy).toBe(0.0424);
    expect(pool.netApy).toBe(0.1694);
    expect(pool.backstopUsd).toBe(1530000);
    expect(pool.status).toBe("ACTIVE");
    expect(pool.reserves[0]).toEqual({
      assetId: USDC_SAC,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 7,
      enabled: true,
      utilization: 0.32,
      supplyApy: 0.0424,
      borrowApy: 0.09,
      emissionsSupplyApr: null,
      suppliedUsd: 50050000,
      borrowedUsd: 16150000,
      priceUsd: 1,
    });
  });

  it.each([
    ["omitted", {}],
    ["null", { backstop_usd: null }],
  ])(
    "maps a %s backstop to null rather than undefined or zero",
    async (_label, backstop) => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: {
          data: {
            pools: [
              {
                id: POOL_ID,
                name: "Fixed Pool v2",
                status: "ACTIVE",
                supplied_usd: 50050000,
                borrowed_usd: 16150000,
                interest_apy: 0.0424,
                net_apy: 0.1694,
                ...backstop,
                reserves: [],
              },
            ],
          },
        },
      });

      const [pool] = await getBlendPools({ networkDetails });

      expect(pool.backstopUsd).toBeNull();
    },
  );

  it("throws on a non-200", async () => {
    mockedSend.mockResolvedValue({ status: 503, body: {} });

    await expect(getBlendPools({ networkDetails })).rejects.toThrow();
  });
});

describe("getBlendSuppliedTokens", () => {
  const buildBody = (supply: unknown[]) => ({
    status: 200,
    body: {
      data: [
        {
          address: PUBLIC_KEY,
          total_value_usd: 500.12,
          net_apy: 0.1694,
          positions: [
            {
              protocol: "BLEND",
              id: POOL_ID,
              name: "Fixed Pool v2",
              net_usd: 500.12,
              supplied_usd: 500.12,
              borrowed_usd: 0,
              net_apy: 0.1694,
              blend: { supply, borrow: [] },
            },
          ],
          backstop: [],
        },
      ],
    },
  });

  const call = () =>
    getBlendSuppliedTokens({
      publicKey: PUBLIC_KEY,
      poolId: POOL_ID,
      assetId: USDC_SAC,
      networkDetails,
    });

  it("POSTs the address batch with the network in the path", async () => {
    mockedSend.mockResolvedValue({ status: 200, body: { data: [] } });

    await call();

    expect(mockedSend).toHaveBeenCalledWith({
      type: SERVICE_TYPES.FETCH_BACKEND_V2,
      activePublicKey: null,
      method: "POST",
      path: "/accounts/positions?network=PUBLIC",
      body: JSON.stringify({ addresses: [PUBLIC_KEY] }),
    });
  });

  it("reads total_tokens, not supplied_tokens", async () => {
    // Deposits use SupplyCollateral, so the balance lands in collateral_tokens.
    // Reading supplied_tokens here would always report zero.
    mockedSend.mockResolvedValue(
      buildBody([
        {
          asset_id: USDC_SAC,
          supplied_tokens: "0",
          collateral_tokens: "5000000000",
          total_tokens: "5000000000",
        },
      ]),
    );

    expect(await call()).toBe("5000000000");
  });

  it("returns 0 when the account has no position", async () => {
    mockedSend.mockResolvedValue({ status: 200, body: { data: [] } });

    expect(await call()).toBe("0");
  });

  it("returns 0 when the pool is present but the asset is not", async () => {
    mockedSend.mockResolvedValue(
      buildBody([
        {
          asset_id: XLM_SAC,
          supplied_tokens: "0",
          collateral_tokens: "3700000000",
          total_tokens: "3700000000",
        },
      ]),
    );

    expect(await call()).toBe("0");
  });

  it("returns 0 when the account holds positions only in another pool", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: [
          {
            address: PUBLIC_KEY,
            positions: [
              {
                protocol: "BLEND",
                id: "COTHERPOOL",
                blend: {
                  supply: [{ asset_id: USDC_SAC, total_tokens: "999" }],
                  borrow: [],
                },
              },
            ],
            backstop: [],
          },
        ],
      },
    });

    expect(await call()).toBe("0");
  });

  it("returns 0 when the pool row carries no blend detail", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: [
          { address: PUBLIC_KEY, positions: [{ id: POOL_ID }], backstop: [] },
        ],
      },
    });

    expect(await call()).toBe("0");
  });

  it("throws on a non-200 so the caller can fall back", async () => {
    mockedSend.mockResolvedValue({ status: 500, body: {} });

    await expect(call()).rejects.toThrow();
  });
});
