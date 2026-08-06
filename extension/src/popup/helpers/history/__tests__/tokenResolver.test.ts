import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";

import {
  buildTokenContext,
  getResolvedToken,
} from "popup/helpers/history/tokenResolver";
import { getNativeContractDetails } from "popup/helpers/searchAsset";

jest.mock("@shared/api/helpers/getIconFromTokenList", () => ({
  getIconFromTokenLists: jest.fn().mockResolvedValue({ icon: undefined }),
}));

const PUBLIC_KEY = "GDE5GICS42N336DAWY7XLF7VRZN6RRCGXLXUBJMZWB453CBF72MLU2UD";
/** an 18-decimal SEP-41 token — the case a guessed 7 renders 10^11 times large */
const EIGHTEEN_DEC = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";
const UNKNOWN = "CDDS7IQJGQ2ZMO66E3MUYXZ56H2OO7RBTTAGZLZKOEA4EXCGZX65JGA7";

const tokenList = (
  overrides: Partial<AssetListResponse["assets"][0]> = {},
): AssetListResponse[] => [
  {
    name: "test list",
    description: "",
    network: "testnet",
    version: "1",
    provider: "test",
    assets: [
      {
        code: "deJTRSY",
        issuer: "",
        contract: EIGHTEEN_DEC,
        domain: "example.com",
        icon: "https://example.com/icon.png",
        decimals: 18,
        ...overrides,
      },
    ],
  },
];

const build = (params: Partial<Parameters<typeof buildTokenContext>[0]> = {}) =>
  buildTokenContext({
    tokenIds: [UNKNOWN],
    networkDetails: TESTNET_NETWORK_DETAILS,
    publicKey: PUBLIC_KEY,
    ...params,
  });

describe("buildTokenContext", () => {
  it("passes the active public key to the token details lookup", async () => {
    // an empty pub_key is rejected by the backend (400), which silently sent
    // every token to the unresolved fallback
    const getTokenDetailsFn = jest.fn().mockResolvedValue(null);

    await build({ getTokenDetailsFn });

    expect(getTokenDetailsFn).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: PUBLIC_KEY }),
    );
  });

  it("resolves a curated-list token without any network call", async () => {
    const getTokenDetailsFn = jest.fn().mockResolvedValue(null);

    const context = await build({
      tokenIds: [EIGHTEEN_DEC],
      assetsListsData: tokenList(),
      getTokenDetailsFn,
    });

    expect(context.get(EIGHTEEN_DEC)).toEqual({
      code: "deJTRSY",
      contractId: EIGHTEEN_DEC,
      issuer: null,
      icon: "https://example.com/icon.png",
      decimals: 18,
    });
    expect(getTokenDetailsFn).not.toHaveBeenCalled();
  });

  it("matches list entries case-insensitively", async () => {
    const context = await build({
      tokenIds: [EIGHTEEN_DEC],
      assetsListsData: tokenList({ contract: EIGHTEEN_DEC.toLowerCase() }),
      getTokenDetailsFn: jest.fn().mockResolvedValue(null),
    });

    expect(context.get(EIGHTEEN_DEC)?.decimals).toBe(18);
  });

  it("takes decimals from token details when no list has the token", async () => {
    const getTokenDetailsFn = jest
      .fn()
      .mockResolvedValue({ name: "deJTRSY", symbol: "deJTRSY", decimals: 18 });

    const context = await build({
      tokenIds: [EIGHTEEN_DEC],
      getTokenDetailsFn,
    });

    expect(context.get(EIGHTEEN_DEC)).toMatchObject({
      code: "deJTRSY",
      decimals: 18,
    });
  });

  it("reports unknown decimals rather than assuming 7 when nothing resolves", async () => {
    const context = await build({
      getTokenDetailsFn: jest.fn().mockResolvedValue(null),
    });

    expect(context.get(UNKNOWN)).toEqual({
      code: "CDDS…JGA7",
      contractId: UNKNOWN,
      issuer: null,
      icon: null,
      decimals: null,
    });
  });

  it("keeps a symbol but not a scale when details omit decimals", async () => {
    const context = await build({
      getTokenDetailsFn: jest
        .fn()
        .mockResolvedValue({ name: "Token", symbol: "TKN" }),
    });

    expect(context.get(UNKNOWN)).toMatchObject({
      code: "TKN",
      decimals: null,
    });
  });

  it("reports unknown decimals when the details lookup throws", async () => {
    const context = await build({
      getTokenDetailsFn: jest.fn().mockRejectedValue(new Error("offline")),
    });

    expect(context.get(UNKNOWN)?.decimals).toBeNull();
  });

  it("resolves the native SAC to XLM at classic precision", async () => {
    const nativeContract = getNativeContractDetails(
      TESTNET_NETWORK_DETAILS,
    ).contract;
    const getTokenDetailsFn = jest.fn();

    const context = await build({
      tokenIds: [nativeContract],
      getTokenDetailsFn,
    });

    expect(context.get(nativeContract)).toMatchObject({
      code: "XLM",
      decimals: 7,
    });
    expect(getTokenDetailsFn).not.toHaveBeenCalled();
  });

  it("resolves a held classic asset from balances at classic precision", async () => {
    const usdcIssuer =
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
    const balances = {
      balances: {
        "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5": {
          token: { code: "USDC", issuer: { key: usdcIssuer } },
        },
      },
      icons: {},
    } as unknown as Parameters<typeof buildTokenContext>[0]["balances"];
    const getTokenDetailsFn = jest.fn();

    // the SAC address the mapper would see for that classic asset
    const { Asset } = await import("stellar-sdk");
    const sacId = new Asset("USDC", usdcIssuer).contractId(
      TESTNET_NETWORK_DETAILS.networkPassphrase,
    );

    const context = await build({
      tokenIds: [sacId],
      balances,
      getTokenDetailsFn,
    });

    expect(context.get(sacId)).toMatchObject({ code: "USDC", decimals: 7 });
    expect(getTokenDetailsFn).not.toHaveBeenCalled();
  });
});

describe("getResolvedToken", () => {
  it("falls back to unknown decimals for a token id missing from the map", () => {
    expect(getResolvedToken(new Map(), UNKNOWN)).toEqual({
      code: "CDDS…JGA7",
      contractId: UNKNOWN,
      issuer: null,
      icon: null,
      decimals: null,
    });
  });
});
