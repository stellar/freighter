import BigNumber from "bignumber.js";
import { Asset, Networks } from "stellar-sdk";

import { AssetType } from "@shared/api/types/account-balance";
import {
  getNativeContractId,
  isNativeAsset,
  isNativeAssetId,
  isNativeAssetPair,
  isNativeBalance,
  isNativeContract,
} from "@shared/helpers/assetIdentity";

// A classic asset that uses the native asset's display code but carries its
// own issuer. It is a different asset from the native lumen, and every
// predicate has to say so.
const XLM_CODED_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

// The published native SAC addresses. Pinned rather than re-derived, so these
// tests also assert that deriving from the passphrase reproduces the values
// getNativeContractDetails hardcodes before Task 8 removes them.
const NATIVE_SAC_PUBLIC =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const NATIVE_SAC_TESTNET =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const nativeBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
  buyingLiabilities: "0",
  sellingLiabilities: "0",
  minimumBalance: "1",
  blockaidData: {},
} as unknown as AssetType;

const xlmCodedClassicBalance = {
  token: {
    type: "credit_alphanum4",
    code: "XLM",
    issuer: { key: XLM_CODED_ISSUER },
  },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
  buyingLiabilities: "0",
  sellingLiabilities: "0",
  blockaidData: {},
} as unknown as AssetType;

describe("isNativeAssetId", () => {
  it("accepts the native identifier", () => {
    expect(isNativeAssetId("native")).toBe(true);
  });

  it("rejects the display code, which is not an identifier", () => {
    expect(isNativeAssetId("XLM")).toBe(false);
  });

  it("rejects a canonical pair that uses the native code", () => {
    expect(isNativeAssetId(`XLM:${XLM_CODED_ISSUER}`)).toBe(false);
  });

  it("rejects an absent id", () => {
    expect(isNativeAssetId(undefined)).toBe(false);
    expect(isNativeAssetId(null)).toBe(false);
  });
});

describe("isNativeAssetPair", () => {
  it("accepts the native code with no issuer", () => {
    expect(isNativeAssetPair("XLM", undefined)).toBe(true);
    expect(isNativeAssetPair("XLM", "")).toBe(true);
  });

  it("rejects the native code paired with an issuer", () => {
    expect(isNativeAssetPair("XLM", XLM_CODED_ISSUER)).toBe(false);
  });

  it("rejects a different code with no issuer", () => {
    expect(isNativeAssetPair("USDC", undefined)).toBe(false);
  });
});

describe("isNativeBalance", () => {
  it("accepts a native-typed balance", () => {
    expect(isNativeBalance(nativeBalance)).toBe(true);
  });

  it("rejects a classic balance that uses the native code", () => {
    expect(isNativeBalance(xlmCodedClassicBalance)).toBe(false);
  });
});

describe("isNativeAsset", () => {
  it("accepts the SDK native asset", () => {
    expect(isNativeAsset(Asset.native())).toBe(true);
  });

  it("rejects a classic asset that uses the native code", () => {
    expect(isNativeAsset(new Asset("XLM", XLM_CODED_ISSUER))).toBe(false);
  });

  it("rejects the plain shape used for Soroban issuers", () => {
    expect(
      isNativeAsset({
        code: "XLM",
        issuer: "CCV3NAKLIBBNSJNNTV2AZVRX6VODUDWK4TVYILE5MW6R45SSQJS5VCAM",
      }),
    ).toBe(false);
  });
});

describe("getNativeContractId", () => {
  it("reproduces the published mainnet native SAC address", () => {
    expect(getNativeContractId(Networks.PUBLIC)).toBe(NATIVE_SAC_PUBLIC);
  });

  it("reproduces the published testnet native SAC address", () => {
    expect(getNativeContractId(Networks.TESTNET)).toBe(NATIVE_SAC_TESTNET);
  });

  it("returns a real address on a network the old lookup table omitted", () => {
    const futurenet = getNativeContractId(Networks.FUTURENET);
    expect(futurenet).toMatch(/^C[A-Z2-7]{55}$/);
    expect(futurenet).not.toBe(NATIVE_SAC_PUBLIC);
  });
});

describe("isNativeContract", () => {
  it("accepts the native SAC for its own network", () => {
    expect(isNativeContract(NATIVE_SAC_PUBLIC, Networks.PUBLIC)).toBe(true);
  });

  it("rejects the native SAC of a different network", () => {
    expect(isNativeContract(NATIVE_SAC_TESTNET, Networks.PUBLIC)).toBe(false);
  });

  it("rejects the wrapped contract of a classic asset using the native code", () => {
    const wrapped = new Asset("XLM", XLM_CODED_ISSUER).contractId(
      Networks.PUBLIC,
    );
    expect(isNativeContract(wrapped, Networks.PUBLIC)).toBe(false);
  });

  it("rejects an empty contract id, which an absent lookup can produce", () => {
    expect(isNativeContract("", Networks.PUBLIC)).toBe(false);
    expect(isNativeContract(undefined, Networks.PUBLIC)).toBe(false);
  });
});
