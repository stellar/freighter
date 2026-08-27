import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/constants/sac";
import { toPositionTokenRows } from "../positionRows";

const networkDetails = MAINNET_NETWORK_DETAILS;
const USDC_SAC = PUBLIC_SACS.USDC!;
const XLM_SAC = PUBLIC_SACS.XLM;
const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";

const supplyRow = (over: Record<string, unknown> = {}) => ({
  assetId: USDC_SAC,
  symbol: "USDC",
  name: "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
  decimals: 7,
  suppliedTokens: "0",
  collateralTokens: "5001223000",
  totalTokens: "5001223000",
  usdValue: 500.12,
  apy: 0.1694,
  emissionsApr: 0,
  interestEarned: "1234000",
  interestEarnedUsd: 0.12,
  claimableBlnd: "0",
  claimableUsd: null,
  priceUsd: 1,
  ...over,
});

const accountPositions = (supply: unknown[]) =>
  ({
    address: "G…",
    totalValueUsd: 500.12,
    netApy: 0.1694,
    positions: [
      {
        protocol: "blend",
        id: POOL_ID,
        name: "Fixed Pool v2",
        netUsd: 500.12,
        suppliedUsd: 500.12,
        borrowedUsd: 0,
        netApy: 0.1694,
        blend: { supply, borrow: [] },
      },
    ],
    backstop: [],
  }) as never;

describe("toPositionTokenRows", () => {
  it("returns nothing for a null payload", () => {
    expect(toPositionTokenRows({ positions: null, networkDetails })).toEqual(
      [],
    );
  });

  it("scales raw token amounts by the row's decimals", () => {
    // Raw integer strings in the asset's smallest unit — parsing to Number
    // would lose precision on large balances.
    const [row] = toPositionTokenRows({
      positions: accountPositions([supplyRow()]),
      networkDetails,
    });

    expect(row.suppliedTokens).toBe("500.1223");
    expect(row.decimals).toBe(7);
  });

  it("carries the pool and protocol so the row can open the right sheet", () => {
    const [row] = toPositionTokenRows({
      positions: accountPositions([supplyRow()]),
      networkDetails,
    });

    expect(row.poolId).toBe(POOL_ID);
    expect(row.poolName).toBe("Fixed Pool v2");
    expect(row.protocol).toBe("blend");
  });

  it("adds emissions to the headline rate", () => {
    const [row] = toPositionTokenRows({
      positions: accountPositions([
        supplyRow({ apy: 0.1, emissionsApr: 0.05 }),
      ]),
      networkDetails,
    });

    expect(row.apy).toBeCloseTo(0.15);
  });

  it("keeps an unavailable rate null rather than treating it as zero", () => {
    const [row] = toPositionTokenRows({
      positions: accountPositions([
        supplyRow({ apy: null, emissionsApr: 0.05 }),
      ]),
      networkDetails,
    });

    expect(row.apy).toBeNull();
  });

  it("resolves native XLM, which the payload reports with no symbol and no name", () => {
    // Its SAC is the only clue — reading `symbol` alone would render a
    // truncated contract address as the token code.
    const [row] = toPositionTokenRows({
      positions: accountPositions([
        supplyRow({ assetId: XLM_SAC, symbol: null, name: null }),
      ]),
      networkDetails,
    });

    expect(row.code).toBe("XLM");
  });

  it("emits one row per supplied asset in a pool", () => {
    const rows = toPositionTokenRows({
      positions: accountPositions([
        supplyRow(),
        supplyRow({ assetId: XLM_SAC, symbol: null, name: null }),
      ]),
      networkDetails,
    });

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.poolId === POOL_ID)).toBe(true);
  });

  it("skips a pool row carrying no blend detail", () => {
    const positions = {
      address: "G…",
      totalValueUsd: null,
      netApy: null,
      positions: [
        {
          protocol: "blend",
          id: POOL_ID,
          name: null,
          netUsd: null,
          suppliedUsd: null,
          borrowedUsd: null,
          netApy: null,
        },
      ],
      backstop: [],
    } as never;

    expect(toPositionTokenRows({ positions, networkDetails })).toEqual([]);
  });
});
