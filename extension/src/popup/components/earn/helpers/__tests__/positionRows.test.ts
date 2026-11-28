import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/api/__tests__/fixtures/sac";
import { toPositionTokenRows } from "../positionRows";

const networkDetails = MAINNET_NETWORK_DETAILS;
const USDC_SAC = PUBLIC_SACS.USDC!;
const XLM_SAC = PUBLIC_SACS.XLM;
const POOL_ID = "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";

const supplyRow = (over: Record<string, unknown> = {}) => ({
  assetId: USDC_SAC,
  symbol: "USDC",
  name: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
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

const poolPosition = (supply: unknown[]) =>
  ({
    protocol: "blend",
    id: POOL_ID,
    name: "Fixed Pool v2",
    netUsd: 500.12,
    suppliedUsd: 500.12,
    borrowedUsd: 0,
    netApy: 0.1694,
    blend: { supply, borrow: [] },
  }) as never;

describe("toPositionTokenRows", () => {
  it("scales raw token amounts by the row's decimals", () => {
    // Raw integer strings in the asset's smallest unit — parsing to Number
    // would lose precision on large balances.
    const [row] = toPositionTokenRows({
      position: poolPosition([supplyRow()]),
      networkDetails,
    });

    expect(row.suppliedTokens).toBe("500.1223");
    expect(row.decimals).toBe(7);
  });

  it("carries the pool and protocol so the row can open the right sheet", () => {
    const [row] = toPositionTokenRows({
      position: poolPosition([supplyRow()]),
      networkDetails,
    });

    expect(row.poolId).toBe(POOL_ID);
    expect(row.poolName).toBe("Fixed Pool v2");
    expect(row.protocol).toBe("blend");
  });

  it("rates a row on supply interest alone, leaving emissions out", () => {
    const [row] = toPositionTokenRows({
      position: poolPosition([supplyRow({ apy: 0.1, emissionsApr: 0.05 })]),
      networkDetails,
    });

    expect(row.apy).toBe(0.1);
  });

  it("keeps an unavailable rate null rather than treating it as zero", () => {
    const [row] = toPositionTokenRows({
      position: poolPosition([supplyRow({ apy: null, emissionsApr: 0.05 })]),
      networkDetails,
    });

    expect(row.apy).toBeNull();
  });

  it("resolves native XLM, which the payload reports with no symbol and no name", () => {
    // Its SAC is the only clue — reading `symbol` alone would render a
    // truncated contract address as the token code.
    const [row] = toPositionTokenRows({
      position: poolPosition([
        supplyRow({ assetId: XLM_SAC, symbol: null, name: null }),
      ]),
      networkDetails,
    });

    expect(row.code).toBe("XLM");
  });

  it("emits one row per supplied asset in a pool", () => {
    const rows = toPositionTokenRows({
      position: poolPosition([
        supplyRow(),
        supplyRow({ assetId: XLM_SAC, symbol: null, name: null }),
      ]),
      networkDetails,
    });

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.poolId === POOL_ID)).toBe(true);
  });

  it("returns nothing for a pool carrying no blend detail", () => {
    const position = {
      protocol: "blend",
      id: POOL_ID,
      name: null,
      netUsd: null,
      suppliedUsd: null,
      borrowedUsd: null,
      netApy: null,
    } as never;

    expect(toPositionTokenRows({ position, networkDetails })).toEqual([]);
  });

  it.each([
    ["an 18-decimal token", 18, "1500000000000000000", "1.5"],
    ["a 0-decimal token", 0, "15", "15"],
    ["a 7-decimal token", 7, "5001223000", "500.1223"],
    ["a SAC with no decimals in the payload", null, "5001223000", "500.1223"],
  ])("scales %s by its own decimals", (_, decimals, totalTokens, expected) => {
    const [row] = toPositionTokenRows({
      position: poolPosition([supplyRow({ decimals, totalTokens })]),
      networkDetails,
    });

    expect(row.suppliedTokens).toBe(expected);
  });

  it("scales native XLM with no decimals in the payload by 7", () => {
    const [row] = toPositionTokenRows({
      position: poolPosition([
        supplyRow({
          assetId: XLM_SAC,
          symbol: null,
          name: null,
          decimals: null,
          totalTokens: "1200400000",
        }),
      ]),
      networkDetails,
    });

    expect(row.suppliedTokens).toBe("120.04");
  });

  it("leaves a Soroban-only token's amounts unknown without its decimals", () => {
    // A SEP-41 token can use any scale; 7 would be a guess.
    const [row] = toPositionTokenRows({
      position: poolPosition([
        supplyRow({
          assetId: "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD",
          symbol: "FOO",
          name: "Foo Token",
          decimals: null,
        }),
      ]),
      networkDetails,
    });

    expect(row.code).toBe("FOO");
    expect(row.decimals).toBeNull();
    expect(row.suppliedTokens).toBeNull();
    expect(row.suppliedUsd).toBe(500.12);
  });

  it("scales a Soroban-only token by the decimals the payload reports", () => {
    const [row] = toPositionTokenRows({
      position: poolPosition([
        supplyRow({
          assetId: "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD",
          symbol: "FOO",
          name: "Foo Token",
          decimals: 18,
          totalTokens: "2500000000000000000",
        }),
      ]),
      networkDetails,
    });

    expect(row.suppliedTokens).toBe("2.5");
  });

  // Its own contract is its issuer, as for the contract tokens Home lists, so
  // its icon and a deposit from it land on the same "CODE:CONTRACT" key.
  it("gives a Soroban-only token its contract as issuer", () => {
    const FOO_CONTRACT =
      "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD";
    const [row] = toPositionTokenRows({
      position: poolPosition([
        supplyRow({ assetId: FOO_CONTRACT, symbol: "FOO", name: "Foo Token" }),
      ]),
      networkDetails,
    });

    expect(row.code).toBe("FOO");
    expect(row.issuer).toBe(FOO_CONTRACT);
  });
});
