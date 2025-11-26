import { validAssetList } from "popup/__testHelpers__";
import * as SearchAsset from "../searchAsset";
import { schemaValidatedAssetList } from "@shared/api/helpers/token-list";

/**
 * SEP-0042 Asset List JSON Schema
 * This schema is used for testing schema validation in tests.
 * @see https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0042.md
 */
const SEP_0042_ASSET_LIST_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    provider: { type: "string" },
    description: { type: "string" },
    version: { type: "string" },
    network: { type: "string" },
    assets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          issuer: { type: "string" },
          contract: { type: "string" },
          name: { type: "string" },
          org: { type: "string" },
          domain: { type: "string" },
          icon: { type: "string" },
          decimals: { type: "number" },
        },
        required: ["code", "issuer", "contract", "domain", "icon", "decimals"],
      },
    },
  },
  required: ["name", "provider", "description", "version", "network", "assets"],
};

describe("searchAsset", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("should getNativeContractDetails for Mainnet", () => {
    expect(
      SearchAsset.getNativeContractDetails({ network: "PUBLIC" }),
    ).toStrictEqual({
      contract: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
      issuer: "GDMTVHLWJTHSUDMZVVMXXH6VJHA2ZV3HNG5LYNAZ6RTWB7GISM6PGTUV",
      code: "XLM",
      decimals: 7,
      domain: "https://stellar.org",
      icon: "",
      org: "",
    });
  });
  it("should getNativeContractDetails for Testnet", () => {
    expect(
      SearchAsset.getNativeContractDetails({ network: "TESTNET" }),
    ).toStrictEqual({
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      issuer: "",
      code: "XLM",
      decimals: 7,
      domain: "https://stellar.org",
      icon: "",
      org: "",
    });
  });
  it("should not getNativeContractDetails for non-Mainnet and non-Testnet", () => {
    expect(
      SearchAsset.getNativeContractDetails({ network: "foo" }),
    ).toStrictEqual({
      code: "XLM",
      decimals: 7,
      domain: "https://stellar.org",
      icon: "",
      org: "",
      contract: "",
      issuer: "",
    });
  });
  it("schemaValidatedAssetList should return list if valid", async () => {
    // Mock the schema fetch
    jest.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.includes("assetlist.schema.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => SEP_0042_ASSET_LIST_SCHEMA,
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { assets } = await schemaValidatedAssetList(validAssetList);
    expect(assets).toStrictEqual(validAssetList.assets);
  });
  it("schemaValidatedAssetList should return empty list if schema fetch fails", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
      }),
    );
    const { assets } = await schemaValidatedAssetList(validAssetList);
    expect(assets).toStrictEqual([]);
  });
  it("schemaValidatedAssetList should return empty list and errors if validation fails", async () => {
    // Mock the schema fetch
    jest.spyOn(global, "fetch").mockImplementation((url) => {
      if (url.includes("assetlist.schema.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...SEP_0042_ASSET_LIST_SCHEMA,
            additionalProperties: false,
          }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { assets, errors } = await schemaValidatedAssetList({
      // incorrect key
      title: "PiyalBasu Top 50",
      provider: "PiyalBasu",
      description: "Test asset list schema",
      version: "1.0",
      network: "public",
      feedback: "https://piyalbasu.org",
      assets: [
        {
          code: "yXLM",
          issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55",
          contract: "CBZVSNVB55ANF24QVJL2K5QCLOAB6XITGTGXYEAF6NPTXYKEJUYQOHFC",
          name: "yXLM",
          org: "Ultra Capital LLC dba Ultra Capital",
          domain: "ultracapital.xyz",
          icon: "https://ipfs.io/ipfs/bafkreihntcz2lpaxawmbhwidtuifladkgew6olwuly2dz5pewqillhhpay",
          decimals: 7,
        },
      ],
    });
    expect(assets).toStrictEqual([]);

    // error for missing `name` and error for additional key `title` and error for 'feedback'
    expect(errors).toHaveLength(3);
  });
});
