import { isBulkScannableAssetId } from "@shared/helpers/blockaid";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CONTRACT = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

describe("isBulkScannableAssetId", () => {
  it("accepts a classic CODE-ISSUER id", () => {
    expect(isBulkScannableAssetId(`USDC-${ISSUER}`)).toBe(true);
  });

  it("accepts a SEP-41 SYMBOL-CONTRACT id", () => {
    expect(isBulkScannableAssetId(`yUSDC-${CONTRACT}`)).toBe(true);
  });

  // freighter-backend reads split("-")[1] as the issuer and rejects the whole
  // batch when it isn't a G or C key.
  it("rejects an id whose symbol contains a hyphen", () => {
    expect(isBulkScannableAssetId(`USDC-SEAV-${CONTRACT}`)).toBe(false);
  });

  // A symbol "SC:AM" gives the balance key "SC:AM:C…", which maps to
  // "SC-AM:C…": one hyphen, but the backend reads "AM:C…" as the key.
  it("rejects an id whose symbol contains a colon", () => {
    expect(isBulkScannableAssetId(`SC-AM:${CONTRACT}`)).toBe(false);
  });

  it("rejects an id without a valid issuer key", () => {
    expect(isBulkScannableAssetId("USDC-GISSUER")).toBe(false);
    expect(isBulkScannableAssetId("USDC-undefined")).toBe(false);
  });

  // Blockaid fails the whole batch on a code it can't take, and a token
  // without a symbol uses its 56-character contract id as the code.
  it("rejects a code longer than 12 characters", () => {
    expect(isBulkScannableAssetId(`${CONTRACT}-${CONTRACT}`)).toBe(false);
    expect(isBulkScannableAssetId(`ABCDEFGHIJKLM-${ISSUER}`)).toBe(false);
  });

  it("rejects a code with a character Blockaid can't take", () => {
    ["USDC.e", "US$C", "USD+", "US DC", "🚀", "USD²", ""].forEach((code) =>
      expect(isBulkScannableAssetId(`${code}-${CONTRACT}`)).toBe(false),
    );
  });

  // Blockaid scans symbols in any script, so a lookalike such as "USDС"
  // (Cyrillic С) must still be sent for its impersonation verdict.
  it("accepts letters in any script, digits and underscores", () => {
    ["decaf_usdc", "USDС", "ABCDEFGHIJKL", "123"].forEach((code) =>
      expect(isBulkScannableAssetId(`${code}-${CONTRACT}`)).toBe(true),
    );
  });
});
