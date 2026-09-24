import { Asset, Networks } from "stellar-sdk";

import { getChartAssetIdentity, getTokenType } from "popup/helpers/token";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

const PUBNET = Networks.PUBLIC;
const NATIVE_SAC = Asset.native().contractId(PUBNET);
const CONTRACT_ID = "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";
const CLASSIC_ISSUER =
  "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

describe("getChartAssetIdentity", () => {
  // Every representation of the native asset must produce ONE identity, or
  // the same token splits into several rows in the §7.5 analytics.
  it.each([
    ["the canonical id", "native"],
    ["its own SAC, bare", NATIVE_SAC],
    // Contract balances are canonicalized `symbol:contractId`, so this is how
    // the SAC actually arrives from a balance list.
    ["its own SAC as SYMBOL:CONTRACTID", `XLM:${NATIVE_SAC}`],
  ])("reports native XLM with no issuer — %s", (_label, token) => {
    expect(getChartAssetIdentity(token, PUBNET)).toEqual({
      asset_code: "XLM",
      token_type: "native",
    });
  });

  it("reports both halves for a classic asset", () => {
    expect(getChartAssetIdentity(`USDC:${CLASSIC_ISSUER}`, PUBNET)).toEqual({
      asset_code: "USDC",
      asset_issuer: CLASSIC_ISSUER,
      token_type: "classic",
    });
  });

  it("reports issuer only for a bare non-native contract id", () => {
    expect(getChartAssetIdentity(CONTRACT_ID, PUBNET)).toEqual({
      asset_issuer: CONTRACT_ID,
      token_type: "soroban",
    });
  });

  it("keeps a non-native SYMBOL:CONTRACTID as soroban with both halves", () => {
    expect(getChartAssetIdentity(`DT:${CONTRACT_ID}`, PUBNET)).toEqual({
      asset_code: "DT",
      asset_issuer: CONTRACT_ID,
      token_type: "soroban",
    });
  });

  // A contract token's symbol is whatever the contract reports, colons
  // included; the issuer never contains one, so the split is on the last.
  it("splits SYMBOL:CONTRACTID on the last colon when the symbol has one", () => {
    expect(getTokenType(`A:B:${CONTRACT_ID}`, PUBNET)).toBe("soroban");
    expect(getChartAssetIdentity(`A:B:${CONTRACT_ID}`, PUBNET)).toEqual({
      asset_code: "A:B",
      asset_issuer: CONTRACT_ID,
      token_type: "soroban",
    });
  });

  it("without a network, the SAC stays soroban — the documented opt-in", () => {
    expect(getTokenType(`XLM:${NATIVE_SAC}`)).toBe("soroban");
    expect(getChartAssetIdentity(`XLM:${NATIVE_SAC}`)).toEqual({
      asset_code: "XLM",
      asset_issuer: NATIVE_SAC,
      token_type: "soroban",
    });
  });
});
