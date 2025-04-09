import { TEST_PUBLIC_KEY, validAssetList } from "popup/__testHelpers__";
import * as TokenListHelpers from "@shared/api/helpers/token-list";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";

const VERIFIED_TOKEN_CONTRACT = validAssetList.assets[0].contract;
const VERIFIED_TOKEN_ISSUER = validAssetList.assets[0].issuer;
const EXPECTED_ICON_URL = validAssetList.assets[0].icon;

jest
  .spyOn(TokenListHelpers, "getCombinedAssetListData")
  .mockImplementation(() => Promise.resolve([validAssetList]));

describe("getIconFromTokenLists", () => {
  it("should return an icon if an asset is in a token list by contract ID", async () => {
    const icon = await getIconFromTokenLists({
      networkDetails: TESTNET_NETWORK_DETAILS,
      id: VERIFIED_TOKEN_CONTRACT,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });
    expect(icon).toEqual(EXPECTED_ICON_URL);
  });
  it("should return an icon if an asset is in a token list by issuer", async () => {
    const icon = await getIconFromTokenLists({
      networkDetails: TESTNET_NETWORK_DETAILS,
      id: VERIFIED_TOKEN_ISSUER,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });
    expect(icon).toEqual(EXPECTED_ICON_URL);
  });
  it("should return undefined if an asset is on on the token list", async () => {
    const icon = await getIconFromTokenLists({
      networkDetails: TESTNET_NETWORK_DETAILS,
      id: TEST_PUBLIC_KEY,
      assetsLists: DEFAULT_ASSETS_LISTS,
    });
    expect(icon).toBeUndefined();
  });
});
