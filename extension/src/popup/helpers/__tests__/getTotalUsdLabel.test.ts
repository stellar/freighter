import BigNumber from "bignumber.js";

import { getTotalUsdLabel } from "popup/helpers/balance";
import { ApiTokenPrices } from "@shared/api/types";

const PRICES = {
  "XLM:native": { currentPrice: "0.5", percentagePriceChange24h: null },
} as unknown as ApiTokenPrices;

const label = (overrides: Partial<Parameters<typeof getTotalUsdLabel>[0]>) =>
  getTotalUsdLabel({
    hasError: false,
    hasPriceFeed: true,
    isFunded: true,
    tokenPrices: PRICES,
    totalUsd: new BigNumber("1149.239"),
    ...overrides,
  });

describe("getTotalUsdLabel", () => {
  it("formats the total when it can be determined", () => {
    expect(label({})).toBe("$1,149.23");
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

  it("returns the placeholder when a funded account prices nothing", () => {
    expect(label({ tokenPrices: null })).toBe("--");
    expect(label({ tokenPrices: undefined })).toBe("--");
    expect(label({ tokenPrices: {} as ApiTokenPrices })).toBe("--");
  });

  // A real zero on a priced network still reads as a total, not a gap.
  it("keeps a genuine zero total distinct from the placeholder", () => {
    expect(label({ totalUsd: new BigNumber(0) })).toBe("$0.00");
  });
});
