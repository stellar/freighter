import { Asset, Networks } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { getCatalogIconKey, getCatalogIssuer } from "../earnAssetIcons";

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
        assetId: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
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
        assetId: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
        networkDetails,
      }),
    ).toBe("");
  });
});
