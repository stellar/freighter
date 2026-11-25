import { Asset } from "stellar-sdk";

import {
  LP_ISSUER_KEY,
  getAssetFromCanonical,
  getCanonicalFromAsset,
  splitCanonical,
} from "@shared/helpers/stellar";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CONTRACT = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const POOL_ID =
  "dd7b1ab831c273310ddbec6f97870aa83c2fbd78ce22aded37ecbf4f3380fac7";

describe("splitCanonical", () => {
  it("splits a classic canonical into code and issuer", () => {
    expect(splitCanonical(`USDC:${ISSUER}`)).toEqual({
      code: "USDC",
      issuer: ISSUER,
    });
  });

  it("splits on the last colon, so a symbol containing a colon keeps it", () => {
    expect(splitCanonical(`MY:TOKEN:${CONTRACT}`)).toEqual({
      code: "MY:TOKEN",
      issuer: CONTRACT,
    });
  });

  it("returns an empty issuer when there is no separator", () => {
    expect(splitCanonical("native")).toEqual({ code: "native", issuer: "" });
  });
});

describe("getAssetFromCanonical", () => {
  it("returns the SDK asset for a classic canonical", () => {
    const asset = getAssetFromCanonical(`USDC:${ISSUER}`) as Asset;
    expect(asset.getCode()).toBe("USDC");
    expect(asset.getIssuer()).toBe(ISSUER);
  });

  it("returns the plain shape for a contract token", () => {
    expect(getAssetFromCanonical(`TKN:${CONTRACT}`)).toEqual({
      code: "TKN",
      issuer: CONTRACT,
    });
  });

  it("keeps a colon-bearing symbol whole and round-trips it", () => {
    const canonical = getCanonicalFromAsset("XLM:", CONTRACT);
    expect(getAssetFromCanonical(canonical)).toEqual({
      code: "XLM:",
      issuer: CONTRACT,
    });
  });

  it("accepts the liquidity-pool sentinel issuer", () => {
    expect(getAssetFromCanonical(`${POOL_ID}:${LP_ISSUER_KEY}`)).toEqual({
      code: POOL_ID,
      issuer: LP_ISSUER_KEY,
    });
  });

  it("rejects an issuer that is neither a G address, a C address nor the pool sentinel", () => {
    expect(() => getAssetFromCanonical("XLM:")).toThrow(
      /invalid asset canonical id/,
    );
    expect(() => getAssetFromCanonical("USDC:not-an-issuer")).toThrow();
  });
});
