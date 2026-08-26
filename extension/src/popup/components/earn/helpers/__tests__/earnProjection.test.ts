import BigNumber from "bignumber.js";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/constants/sac";
import { getBestEarnApy, projectAnnualEarnings } from "../earnProjection";

const networkDetails = MAINNET_NETWORK_DETAILS;
const USDC_SAC = PUBLIC_SACS.USDC!;
const XLM_SAC = PUBLIC_SACS.XLM;
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const option = (
  assetId: string,
  apys: (number | null)[],
  symbol: string | null,
) => ({
  assetId,
  symbol,
  name: symbol ? `${symbol}:${USDC_ISSUER}` : null,
  decimals: 7,
  pools: apys.map((supplyApy, i) => ({
    id: `POOL${i}`,
    name: `Pool ${i}`,
    supplyApy,
    emissionsSupplyApr: 0,
    suppliedUsd: 1,
  })),
});

const usdcBalance = {
  token: { code: "USDC", issuer: { key: USDC_ISSUER } },
  contractId: USDC_SAC,
  total: new BigNumber("500"),
  available: new BigNumber("500"),
};
const xlmBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("38"),
  available: new BigNumber("38"),
};

const prices = {
  [`USDC:${USDC_ISSUER}`]: {
    currentPrice: "1.00",
    percentagePriceChange24h: "0",
  },
  native: { currentPrice: "1.00", percentagePriceChange24h: "0" },
} as never;

describe("getBestEarnApy", () => {
  it("returns the highest rate on offer anywhere", () => {
    expect(
      getBestEarnApy([option(USDC_SAC, [0.12, 0.1694], "USDC")]),
    ).toBeCloseTo(0.1694);
  });

  it("returns null when the option has no pools at all", () => {
    // Empty `pools` exercises the reduce's own initial value, not the
    // pool.supplyApy === null skip branch below -- see that test instead.
    expect(getBestEarnApy([option(USDC_SAC, [], "USDC")])).toBeNull();
  });

  it("skips a pool with no priced rate rather than treating it as zero", () => {
    // Null is "unknown", not "zero" — the card must not promise 0% by folding
    // an unpriced pool into the comparison. Mixed with a priced pool so the
    // skip branch is actually exercised, not just the empty-array case above.
    expect(
      getBestEarnApy([option(USDC_SAC, [null, 0.1694], "USDC")]),
    ).toBeCloseTo(0.1694);
  });

  it("returns null when every pool has an unpriced rate", () => {
    expect(getBestEarnApy([option(USDC_SAC, [null, null], "USDC")])).toBeNull();
  });
});

describe("projectAnnualEarnings", () => {
  it("sums each held token's value at that token's best rate", () => {
    const result = projectAnnualEarnings({
      options: [
        option(USDC_SAC, [0.1694], "USDC"),
        option(XLM_SAC, [0.121], null),
      ],
      balances: [usdcBalance, xlmBalance] as never,
      tokenPrices: prices,
      networkDetails,
    });

    // 500 * 0.1694 = 84.70, 38 * 0.121 = 4.598 -> 89.30
    expect(result.usd).toBe("89.30");
  });

  it("ignores tokens no pool accepts", () => {
    const result = projectAnnualEarnings({
      options: [option(USDC_SAC, [0.1694], "USDC")],
      balances: [usdcBalance, xlmBalance] as never,
      tokenPrices: prices,
      networkDetails,
    });

    expect(result.usd).toBe("84.70");
  });

  it("falls back to the best rate alone when nothing supported is held", () => {
    // A new account holds no depositable token, so there is no dollar figure to
    // promise — the card shows the ceiling rate instead.
    const result = projectAnnualEarnings({
      options: [option(USDC_SAC, [0.1694], "USDC")],
      balances: [],
      tokenPrices: prices,
      networkDetails,
    });

    expect(result.usd).toBeNull();
    expect(result.bestApy).toBeCloseTo(0.1694);
  });

  it("skips a held token with no price rather than valuing it at zero", () => {
    const result = projectAnnualEarnings({
      options: [option(USDC_SAC, [0.1694], "USDC")],
      balances: [usdcBalance] as never,
      tokenPrices: {},
      networkDetails,
    });

    expect(result.usd).toBeNull();
  });

  it("returns nothing to show when the catalog never arrived", () => {
    const result = projectAnnualEarnings({
      options: null,
      balances: [usdcBalance] as never,
      tokenPrices: prices,
      networkDetails,
    });

    expect(result).toEqual({ usd: null, bestApy: null });
  });
});
