import {
  shouldCheckUnfundedDestinationWarning,
  shouldShowAccountDoesntExistWarning,
} from "../sendWarnings";

const G_DEST = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";
const C_DEST = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const G_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const C_ISSUER = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

describe("shouldCheckUnfundedDestinationWarning", () => {
  it("applies the rule for native XLM to a G-destination", () => {
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: "native",
        destination: G_DEST,
        isCollectible: false,
      }),
    ).toBe(true);
  });

  it("applies the rule for classic credit_alphanum (G-issuer)", () => {
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: `USDC:${G_ISSUER}`,
        destination: G_DEST,
        isCollectible: false,
      }),
    ).toBe(true);
  });

  it("applies the rule for SAC-wrapped classic asset (G-issuer)", () => {
    // SACs normalize to their underlying classic G-issuer in canonical form.
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: `EURC:${G_ISSUER}`,
        destination: G_DEST,
        isCollectible: false,
      }),
    ).toBe(true);
  });

  it("skips the rule for a pure Soroban custom token (C-issuer)", () => {
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: `TOKEN:${C_ISSUER}`,
        destination: G_DEST,
        isCollectible: false,
      }),
    ).toBe(false);
  });

  it("skips the rule when isCollectible is true regardless of asset", () => {
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: "native",
        destination: G_DEST,
        isCollectible: true,
      }),
    ).toBe(false);
  });

  it("skips the rule when destination is a contract address", () => {
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: `USDC:${G_ISSUER}`,
        destination: C_DEST,
        isCollectible: false,
      }),
    ).toBe(false);
  });

  it("treats empty assetCanonical as classic (defensive)", () => {
    // Real redux default is "native"; "" is not a real runtime path but
    // covered as a defensive case so the helper degrades safely.
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: "",
        destination: G_DEST,
        isCollectible: false,
      }),
    ).toBe(true);
  });

  it("treats empty destination as non-contract", () => {
    expect(
      shouldCheckUnfundedDestinationWarning({
        assetCanonical: "native",
        destination: "",
        isCollectible: false,
      }),
    ).toBe(true);
  });
});

describe("shouldShowAccountDoesntExistWarning", () => {
  const baseClassic = {
    assetCanonical: "native",
    destination: G_DEST,
    isCollectible: false,
  };

  it("shows the warning for default state + unfunded G-destination", () => {
    expect(
      shouldShowAccountDoesntExistWarning({
        ...baseClassic,
        isFunded: false,
      }),
    ).toBe(true);
  });

  it("hides the warning for pure Soroban asset + unfunded G-destination", () => {
    expect(
      shouldShowAccountDoesntExistWarning({
        assetCanonical: `TOKEN:${C_ISSUER}`,
        destination: G_DEST,
        isCollectible: false,
        isFunded: false,
      }),
    ).toBe(false);
  });

  it("hides the warning for collectible state with stale native asset", () => {
    // Reproduces useSendQueryParams.ts:64-85 early-return path where
    // saveIsCollectible(true) runs but the asset destructure path is
    // short-circuited, leaving the redux default "native" in place.
    expect(
      shouldShowAccountDoesntExistWarning({
        assetCanonical: "native",
        destination: G_DEST,
        isCollectible: true,
        isFunded: false,
      }),
    ).toBe(false);
  });

  it("hides the warning for contract destination regardless of asset", () => {
    // useSendToData.tsx:92-93 already skips balance fetch for contract
    // destinations, so this is belt-and-braces.
    expect(
      shouldShowAccountDoesntExistWarning({
        assetCanonical: `USDC:${G_ISSUER}`,
        destination: C_DEST,
        isCollectible: false,
        isFunded: false,
      }),
    ).toBe(false);
  });

  it("hides the warning when isFunded is null (unknown / fetch fallback)", () => {
    // Regression guard for the strict-`=== false` change: AccountBalances.isFunded
    // is `boolean | null` and unknown funding must not warn.
    expect(
      shouldShowAccountDoesntExistWarning({
        ...baseClassic,
        isFunded: null,
      }),
    ).toBe(false);
  });

  it("hides the warning when isFunded is undefined (no balances loaded)", () => {
    expect(
      shouldShowAccountDoesntExistWarning({
        ...baseClassic,
        isFunded: undefined,
      }),
    ).toBe(false);
  });

  it("hides the warning when isFunded is true", () => {
    expect(
      shouldShowAccountDoesntExistWarning({
        ...baseClassic,
        isFunded: true,
      }),
    ).toBe(false);
  });
});
