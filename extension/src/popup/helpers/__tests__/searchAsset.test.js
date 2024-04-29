import * as SearchAsset from "../searchAsset";

const validAssetList = {
  name: "PiyalBasu Top 50",
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
      icon:
        "https://ipfs.io/ipfs/bafkreihntcz2lpaxawmbhwidtuifladkgew6olwuly2dz5pewqillhhpay",
      decimals: 7,
    },
  ],
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
    const v = await SearchAsset.schemaValidatedAssetList(validAssetList);
    expect(v).toStrictEqual(validAssetList);
  });
  it("schemaValidatedAssetList should return empty list if schema fetch fails", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
      }),
    );
    const v = await SearchAsset.schemaValidatedAssetList(validAssetList);
    expect(v).toStrictEqual({ assets: [] });
  });
  it("schemaValidatedAssetList should return empty list and errors if validation fails", async () => {
    const v = await SearchAsset.schemaValidatedAssetList({
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
          icon:
            "https://ipfs.io/ipfs/bafkreihntcz2lpaxawmbhwidtuifladkgew6olwuly2dz5pewqillhhpay",
          decimals: 7,
        },
      ],
    });
    expect(v.assets).toStrictEqual([]);

    // error for missing `name` and error for additional key `title`
    expect(v.errors).toHaveLength(2);
  });
});
