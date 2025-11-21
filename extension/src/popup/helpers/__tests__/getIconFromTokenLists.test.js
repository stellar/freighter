import { TEST_PUBLIC_KEY, validAssetList } from "popup/__testHelpers__";
import * as TokenListHelpers from "@shared/api/helpers/token-list";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";
import { getCanonicalFromAsset } from "helpers/stellar";
import * as ExtensionMessaging from "@shared/api/helpers/extensionMessaging";

const VERIFIED_TOKEN_CONTRACT = validAssetList.assets[0].contract;
const VERIFIED_TOKEN_ISSUER = validAssetList.assets[0].issuer;
const VERIFIED_TOKEN_CODE = validAssetList.assets[0].code;
const EXPECTED_ICON_URL = validAssetList.assets[0].icon;

jest
  .spyOn(ExtensionMessaging, "sendMessageToBackground")
  .mockImplementation(() =>
    Promise.resolve({
      icons: {},
    }),
  ),
  jest
    .spyOn(TokenListHelpers, "getCombinedAssetListData")
    .mockImplementation(() => Promise.resolve([validAssetList]));

describe("getIconFromTokenLists", () => {
  it("should return an icon if an asset is in a token list by contract ID", async () => {
    const { icon, canonicalAsset } = await getIconFromTokenLists({
      networkDetails: TESTNET_NETWORK_DETAILS,
      contractId: VERIFIED_TOKEN_CONTRACT,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList],
    });
    expect(icon).toEqual(EXPECTED_ICON_URL);
    expect(canonicalAsset).toEqual(
      getCanonicalFromAsset(VERIFIED_TOKEN_CODE, VERIFIED_TOKEN_CONTRACT),
    );
  });
  it("should return an icon if an asset is in a token list by issuer", async () => {
    const { icon, canonicalAsset } = await getIconFromTokenLists({
      networkDetails: TESTNET_NETWORK_DETAILS,
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList],
    });
    expect(icon).toEqual(EXPECTED_ICON_URL);
    expect(canonicalAsset).toEqual(
      getCanonicalFromAsset(VERIFIED_TOKEN_CODE, VERIFIED_TOKEN_ISSUER),
    );
  });
  it("should return undefined if an asset is not on the token list", async () => {
    const { icon, canonicalAsset } = await getIconFromTokenLists({
      networkDetails: TESTNET_NETWORK_DETAILS,
      issuerId: TEST_PUBLIC_KEY,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList],
    });
    expect(icon).toBeUndefined();
    expect(canonicalAsset).toBeUndefined();
  });
});
