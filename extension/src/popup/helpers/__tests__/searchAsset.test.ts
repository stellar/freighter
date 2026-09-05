import { Networks } from "stellar-sdk";

import {
  searchAsset,
  getNativeContractDetails,
  buildNativeAssetRow,
  mapStellarExpertRecord,
} from "../searchAsset";
import { NetworkDetails } from "@shared/constants/stellar";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

const MAINNET: NetworkDetails = {
  network: "PUBLIC",
  networkName: "Main Net",
  networkUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  sorobanRpcUrl: "https://soroban.stellar.org",
} as NetworkDetails;

describe("searchAsset", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns the parsed body on a 2xx response", async () => {
    const body = { _embedded: { records: [{ asset: "USDC-GUSD" }] } };
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => body,
    } as unknown as Response);

    const result = await searchAsset({
      asset: "usdc",
      networkDetails: MAINNET,
    });
    expect(result).toEqual(body);
  });

  it("throws on a non-ok response instead of returning a non-records body", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      statusText: "Bad Gateway",
      json: async () => ({ error: "upstream" }),
    } as unknown as Response);

    await expect(
      searchAsset({ asset: "usdc", networkDetails: MAINNET }),
    ).rejects.toThrow("Bad Gateway");
  });
});

describe("getNativeContractDetails", () => {
  it("keeps the published mainnet contract address", () => {
    expect(
      getNativeContractDetails({
        network: "PUBLIC",
        networkPassphrase: Networks.PUBLIC,
      } as never).contract,
    ).toBe("CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA");
  });

  it("returns a contract address on a network the table omitted", () => {
    expect(
      getNativeContractDetails({
        network: "FUTURENET",
        networkPassphrase: Networks.FUTURENET,
      } as never).contract,
    ).toMatch(/^C[A-Z2-7]{55}$/);
  });
});

describe("buildNativeAssetRow", () => {
  const mainnet = {
    network: "PUBLIC",
    networkPassphrase: Networks.PUBLIC,
  } as never;

  it("carries no issuer, because the native asset has none", () => {
    expect(buildNativeAssetRow(mainnet).issuer).toBe("");
  });

  it("produces the native canonical identifier", () => {
    const row = buildNativeAssetRow(mainnet);

    expect(getCanonicalFromAsset(row.code, row.issuer)).toBe("native");
  });

  it("carries the native contract address", () => {
    expect(buildNativeAssetRow(mainnet).contract).toBe(
      "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
    );
  });
});

describe("mapStellarExpertRecord", () => {
  // stellar.expert returns issued assets as `CODE-ISSUER-TYPE` and the native
  // asset as its bare code, with no issuer and no domain.
  const XLM_CODED_ISSUER =
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const USDC_ISSUER =
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const CONTRACT = "CCV3NAKLIBBNSJNNTV2AZVRX6VODUDWK4TVYILE5MW6R45SSQJS5VCAM";

  it("builds the native asset's row with its contract id and no issuer", () => {
    const row = mapStellarExpertRecord({ asset: "XLM" }, MAINNET);

    expect(row.issuer).toBe("");
    expect(row.contract).toBe(
      "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
    );
    expect(getCanonicalFromAsset(row.code, row.issuer)).toBe("native");
  });

  it("keeps a classic asset that uses the native code as its own asset", () => {
    const row = mapStellarExpertRecord(
      { asset: `XLM-${XLM_CODED_ISSUER}-1`, domain: "example.test" },
      MAINNET,
    );

    expect(row.code).toBe("XLM");
    expect(row.issuer).toBe(XLM_CODED_ISSUER);
    expect(row.contract).toBeUndefined();
    expect(getCanonicalFromAsset(row.code, row.issuer)).toBe(
      `XLM:${XLM_CODED_ISSUER}`,
    );
  });

  it("maps an issued asset's code, issuer and domain", () => {
    const row = mapStellarExpertRecord(
      {
        asset: `USDC-${USDC_ISSUER}-1`,
        domain: "centre.io",
        tomlInfo: { image: "https://example.test/usdc.png" },
      },
      MAINNET,
    );

    expect(row).toMatchObject({
      code: "USDC",
      issuer: USDC_ISSUER,
      domain: "centre.io",
      image: "https://example.test/usdc.png",
    });
  });

  it("maps a contract token to a row keyed on its contract id", () => {
    const row = mapStellarExpertRecord(
      { asset: CONTRACT, code: "TKN", token_name: "Token" },
      MAINNET,
    );

    expect(row).toMatchObject({
      code: "TKN",
      issuer: CONTRACT,
      contract: CONTRACT,
      name: "Token",
    });
  });
});
