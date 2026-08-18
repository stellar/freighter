import BigNumber from "bignumber.js";

import { ApiTokenPrices } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";
import { balancesToHeldRecords } from "../useSwapTokenLookup";

const BALANCES = [
  {
    token: { type: "native", code: "XLM" },
    total: new BigNumber("50"),
    available: new BigNumber("50"),
  },
] as unknown as AssetType[];

describe("balancesToHeldRecords price handling", () => {
  it("lists held tokens when prices are available", () => {
    const prices = {
      "XLM:native": { currentPrice: "0.5", percentagePriceChange24h: null },
    } as unknown as ApiTokenPrices;

    expect(
      balancesToHeldRecords({ balances: BALANCES, tokenPrices: prices }),
    ).toHaveLength(1);
  });

  // The price fetch reports failure with null, not undefined, so a default
  // parameter never catches it. Indexing null threw, and the throw escaped the
  // lookup's async effect before it could dispatch — leaving the swap picker
  // on a spinner forever instead of falling back to held tokens.
  it("still lists held tokens when prices are null", () => {
    expect(() =>
      balancesToHeldRecords({ balances: BALANCES, tokenPrices: null }),
    ).not.toThrow();

    expect(
      balancesToHeldRecords({ balances: BALANCES, tokenPrices: null }),
    ).toHaveLength(1);
  });

  it("still lists held tokens when prices are omitted", () => {
    expect(balancesToHeldRecords({ balances: BALANCES })).toHaveLength(1);
  });
});
