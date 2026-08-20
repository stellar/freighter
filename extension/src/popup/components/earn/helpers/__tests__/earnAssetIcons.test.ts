import { Asset, Networks } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { PUBLIC_SACS } from "@shared/constants/sac";
import {
  getCatalogAssetIdentity,
  getCatalogIconKey,
  getCatalogIssuer,
} from "../earnAssetIcons";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const networkDetails = {
  networkPassphrase: Networks.PUBLIC,
} as NetworkDetails;

describe("getCatalogIssuer", () => {
  it("reads the issuer out of the catalog's canonical", () => {
    expect(getCatalogIssuer(`USDC:${USDC_ISSUER}`)).toBe(USDC_ISSUER);
  });

  it("returns nothing for the null name native XLM reports", () => {
    expect(getCatalogIssuer(null)).toBeUndefined();
    expect(getCatalogIssuer(undefined)).toBeUndefined();
  });

  it("rejects a name that is not a canonical", () => {
    // A friendly name, a bare code, and a canonical whose issuer half is junk.
    expect(getCatalogIssuer("Stellar Lumens")).toBeUndefined();
    expect(getCatalogIssuer("USDC")).toBeUndefined();
    expect(getCatalogIssuer("USDC:not-a-key")).toBeUndefined();
    expect(getCatalogIssuer("A:B:C")).toBeUndefined();
  });
});

describe("getCatalogIconKey", () => {
  it("keys a classic asset by canonical", () => {
    expect(
      getCatalogIconKey({
        code: "USDC",
        issuer: USDC_ISSUER,
        assetId: PUBLIC_SACS.USDC!,
        networkDetails,
      }),
    ).toBe(`USDC:${USDC_ISSUER}`);
  });

  it("recognises native XLM by its SAC when the catalog names it nothing", () => {
    expect(
      getCatalogIconKey({
        code: "",
        assetId: Asset.native().contractId(Networks.PUBLIC),
        networkDetails,
      }),
    ).toBe("native");
  });

  it("has no key for an asset with neither issuer nor the native SAC", () => {
    expect(
      getCatalogIconKey({
        code: "",
        assetId: PUBLIC_SACS.USDC!,
        networkDetails,
      }),
    ).toBe("");
  });
});

describe("getCatalogAssetIdentity", () => {
  const USDC_SAC = PUBLIC_SACS.USDC!;

  // The reported bug: the live catalog gives native XLM a null symbol and a null
  // name, so an account holding no XLM had nothing to name the row with and it
  // rendered a truncated contract address instead.
  it("names native XLM from its SAC when the catalog reports nothing", () => {
    expect(
      getCatalogAssetIdentity({
        symbol: null,
        name: null,
        assetId: Asset.native().contractId(Networks.PUBLIC),
        networkDetails,
      }),
    ).toEqual({
      code: "XLM",
      issuer: undefined,
      canonical: "native",
      isNative: true,
    });
  });

  it("prefers the reported symbol", () => {
    const identity = getCatalogAssetIdentity({
      symbol: "USDC",
      name: `USDC:${USDC_ISSUER}`,
      assetId: USDC_SAC,
      networkDetails,
    });
    expect(identity.code).toBe("USDC");
    expect(identity.issuer).toBe(USDC_ISSUER);
    expect(identity.canonical).toBe(`USDC:${USDC_ISSUER}`);
    expect(identity.isNative).toBe(false);
  });

  it("falls back to the canonical's code half when the symbol is missing", () => {
    const identity = getCatalogAssetIdentity({
      symbol: null,
      name: `USDC:${USDC_ISSUER}`,
      assetId: USDC_SAC,
      networkDetails,
    });
    expect(identity.code).toBe("USDC");
    expect(identity.canonical).toBe(`USDC:${USDC_ISSUER}`);
  });

  it("leaves an unnameable asset without a code or key", () => {
    const identity = getCatalogAssetIdentity({
      symbol: null,
      name: null,
      assetId: USDC_SAC,
      networkDetails,
    });
    expect(identity.code).toBe("");
    expect(identity.canonical).toBe("");
    expect(identity.isNative).toBe(false);
  });
});
