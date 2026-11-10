import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import { ApiTokenPrices } from "@shared/api/types";
import { getTotalUsd, getTotalUsdLabel } from "popup/helpers/balance";

const label = (overrides: Partial<Parameters<typeof getTotalUsdLabel>[0]>) =>
  getTotalUsdLabel({
    hasError: false,
    hasPriceFeed: true,
    isFunded: true,
    hasPrices: true,
    totalUsd: new BigNumber("1149.239"),
    ...overrides,
  });

describe("getTotalUsdLabel", () => {
  it("formats the total when it can be determined", () => {
    expect(label({})).toBe("$1,149.24");
  });

  // Zero is a fact here, not a stand-in for a total that went missing.
  it("returns zero where the network prices no tokens", () => {
    expect(label({ hasPriceFeed: false })).toBe("$0.00");
  });

  it("returns zero for an unfunded account", () => {
    expect(label({ isFunded: false })).toBe("$0.00");
  });

  // Zero would claim the account is empty when its balances are unknown.
  it("returns the placeholder when account data failed", () => {
    expect(label({ hasError: true })).toBe("--");
  });

  it("returns the placeholder when no held balance has a price", () => {
    expect(label({ hasPrices: false })).toBe("--");
    expect(label({ hasPrices: undefined })).toBe("--");
  });

  // A real zero on a priced network still reads as a total, not a gap.
  it("keeps a genuine zero total distinct from the placeholder", () => {
    expect(label({ totalUsd: new BigNumber(0) })).toBe("$0.00");
  });
});

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
// A token the account does not hold, such as a swap destination.
const EURC = `EURC:${USDC_ISSUER}`;

const HELD = [
  { token: { type: "native", code: "XLM" }, total: new BigNumber("100") },
  {
    token: {
      type: "credit_alphanum4",
      code: "USDC",
      issuer: { key: USDC_ISSUER },
    },
    total: new BigNumber("40"),
  },
] as unknown as AssetType[];

const usd = (prices: ApiTokenPrices) => {
  const { totalUsd, hasPrices } = getTotalUsd(prices, HELD);
  return { totalUsd: totalUsd.toString(), hasPrices };
};

describe("getTotalUsd", () => {
  it("sums only the priced held balances", () => {
    expect(usd({ native: { currentPrice: "0.5" }, [USDC]: null })).toEqual({
      totalUsd: "50",
      hasPrices: true,
    });
  });

  // The backend can return a key per token with no price behind any of them.
  it("reports no prices when every price is null", () => {
    expect(usd({ native: null, [USDC]: null })).toEqual({
      totalUsd: "0",
      hasPrices: false,
    });
  });

  it("reports no prices for an empty price map", () => {
    expect(usd({})).toEqual({ totalUsd: "0", hasPrices: false });
  });

  // The price cache can keep tokens the account does not hold. They add
  // nothing to the total and do not count as a price.
  it("ignores a price for a token the account does not hold", () => {
    expect(
      usd({ native: null, [USDC]: null, [EURC]: { currentPrice: "1.1" } }),
    ).toEqual({ totalUsd: "0", hasPrices: false });
  });
});
