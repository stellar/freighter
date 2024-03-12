import * as SearchAsset from "../searchAsset";

describe("searchAsset", () => {
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
});
