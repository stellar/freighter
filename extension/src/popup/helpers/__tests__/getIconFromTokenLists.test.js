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

(jest
  .spyOn(ExtensionMessaging, "sendMessageToBackground")
  .mockImplementation(() =>
    Promise.resolve({
      icons: {},
    }),
  ),
  jest
    .spyOn(TokenListHelpers, "getCombinedAssetListData")
    .mockImplementation(() => Promise.resolve([validAssetList])));

describe("getIconFromTokenLists", () => {
  it("should return an icon if an asset is in a token list by contract ID", async () => {
    const { icon, canonicalAsset } = await getIconFromTokenLists({
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
      issuerId: TEST_PUBLIC_KEY,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList],
    });
    expect(icon).toBeUndefined();
    expect(canonicalAsset).toBeUndefined();
  });
});

describe("getIconFromTokenLists list priority", () => {
  // USDT0 is on the Soroswap list with a direct https icon and on the LOBSTR
  // list with an ipfs.io gateway url. That gateway answers curl but returns 403
  // to a browser User-Agent, so an <img> can never load it. Keeping whichever
  // list was read last handed the browser the one url it cannot fetch.
  const laterList = {
    ...validAssetList,
    provider: "Later Provider",
    assets: [
      {
        ...validAssetList.assets[0],
        icon: "https://later-list.example/icon.png",
      },
    ],
  };

  it("uses the icon from the first matching list, matched by issuer", async () => {
    const { icon } = await getIconFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList, laterList],
    });

    expect(icon).toEqual(EXPECTED_ICON_URL);
  });

  it("uses the icon from the first matching list, matched by contract ID", async () => {
    const { icon } = await getIconFromTokenLists({
      contractId: VERIFIED_TOKEN_CONTRACT,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList, laterList],
    });

    expect(icon).toEqual(EXPECTED_ICON_URL);
  });
});
