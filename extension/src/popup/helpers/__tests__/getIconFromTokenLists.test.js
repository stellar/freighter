import { TEST_PUBLIC_KEY, validAssetList } from "popup/__testHelpers__";
import * as TokenListHelpers from "@shared/api/helpers/token-list";
import {
  getIconCandidatesFromTokenLists,
  getIconFromTokenLists,
} from "@shared/api/helpers/getIconFromTokenList";
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

// getIconFromTokenLists is the un-probed single-icon path used by callers that
// render an icon directly (asset search, sign-transaction, history). It has to
// commit to one url without loading it, so it takes the first match. Icon
// selection for balances does not work this way - see getAssetIcons, which
// probes every candidate and keeps whichever renders.
describe("getIconFromTokenLists single-icon fallback", () => {
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

  it("commits to the first matching list when matched by issuer", async () => {
    const { icon } = await getIconFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList, laterList],
    });

    expect(icon).toEqual(EXPECTED_ICON_URL);
  });

  it("commits to the first matching list when matched by contract ID", async () => {
    const { icon } = await getIconFromTokenLists({
      contractId: VERIFIED_TOKEN_CONTRACT,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList, laterList],
    });

    expect(icon).toEqual(EXPECTED_ICON_URL);
  });
});

describe("getIconCandidatesFromTokenLists", () => {
  const listWithIcon = (icon, provider) => ({
    ...validAssetList,
    provider,
    assets: [{ ...validAssetList.assets[0], icon }],
  });

  const SECOND_ICON = "https://second-list.example/icon.png";

  it("collects every matching icon across all lists, in list order", () => {
    const { candidates } = getIconCandidatesFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList, listWithIcon(SECOND_ICON, "Second")],
    });

    expect(candidates).toEqual([EXPECTED_ICON_URL, SECOND_ICON]);
  });

  it("collapses lists that carry the same icon url to a single candidate", () => {
    const { candidates } = getIconCandidatesFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [
        validAssetList,
        listWithIcon(EXPECTED_ICON_URL, "Duplicate"),
      ],
    });

    expect(candidates).toEqual([EXPECTED_ICON_URL]);
  });

  it("reports the canonical asset alongside the candidates", () => {
    const { canonicalAsset } = getIconCandidatesFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList],
    });

    expect(canonicalAsset).toEqual(
      getCanonicalFromAsset(VERIFIED_TOKEN_CODE, VERIFIED_TOKEN_ISSUER),
    );
  });

  it("returns no candidates when the asset is on no list", () => {
    const { candidates, canonicalAsset } = getIconCandidatesFromTokenLists({
      issuerId: TEST_PUBLIC_KEY,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList],
    });

    expect(candidates).toEqual([]);
    expect(canonicalAsset).toBeUndefined();
  });
});
