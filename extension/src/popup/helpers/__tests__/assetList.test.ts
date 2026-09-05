import { Networks } from "stellar-sdk";

import * as TokenListHelpers from "@shared/api/helpers/token-list";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  assetMatchesListItem,
  splitVerifiedAssetCurrency,
} from "popup/helpers/assetList";
import { mapStellarExpertRecord } from "popup/helpers/searchAsset";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const CONTRACT = "CCV3NAKLIBBNSJNNTV2AZVRX6VODUDWK4TVYILE5MW6R45SSQJS5VCAM";

describe("assetMatchesListItem", () => {
  it("matches on a shared issuer", () => {
    expect(assetMatchesListItem({ issuer: ISSUER }, { issuer: ISSUER })).toBe(
      true,
    );
  });

  it("matches on a shared contract", () => {
    expect(
      assetMatchesListItem({ contract: CONTRACT }, { contract: CONTRACT }),
    ).toBe(true);
  });

  it("does not match when both sides are simply absent", () => {
    expect(assetMatchesListItem({}, {})).toBe(false);
  });

  it("does not match a contract-less asset against a contract-less entry", () => {
    expect(
      assetMatchesListItem({ issuer: ISSUER }, { issuer: "GDIFFERENT" }),
    ).toBe(false);
  });
});

describe("splitVerifiedAssetCurrency", () => {
  const MAINNET = {
    network: "PUBLIC",
    networkPassphrase: Networks.PUBLIC,
  } as NetworkDetails;

  // One list with no entries: the only identity seeded into the verified set
  // is the network's native contract, so the split is decided by identity
  // alone rather than by list contents.
  const emptyList = {
    name: "Test List",
    description: "",
    network: "public",
    version: "1.0",
    provider: "test",
    assets: [],
  };

  beforeEach(() => {
    jest
      .spyOn(TokenListHelpers, "schemaValidatedAssetList")
      .mockResolvedValue({ assets: [], errors: null });
  });

  afterEach(() => jest.restoreAllMocks());

  it("files the native asset's search row as verified", async () => {
    const nativeRow = mapStellarExpertRecord({ asset: "XLM" }, MAINNET);

    const { verifiedAssets, unverifiedAssets } =
      await splitVerifiedAssetCurrency({
        networkDetails: MAINNET,
        assets: [nativeRow],
        assetsListsDetails: {} as never,
        cachedAssetLists: [emptyList],
      });

    expect(verifiedAssets).toEqual([nativeRow]);
    expect(unverifiedAssets).toEqual([]);
  });

  it("does not verify a classic asset that uses the native code", async () => {
    const xlmCodedRow = mapStellarExpertRecord(
      { asset: `XLM-${ISSUER}-1` },
      MAINNET,
    );

    const { verifiedAssets, unverifiedAssets } =
      await splitVerifiedAssetCurrency({
        networkDetails: MAINNET,
        assets: [xlmCodedRow],
        assetsListsDetails: {} as never,
        cachedAssetLists: [emptyList],
      });

    expect(verifiedAssets).toEqual([]);
    expect(unverifiedAssets).toEqual([xlmCodedRow]);
  });
});
