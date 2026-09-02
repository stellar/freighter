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
import { SERVICE_TYPES } from "@shared/constants/services";
import * as IconProbe from "@shared/api/helpers/iconProbe";

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

// jsdom images never fire load or error, so stand in for the browser. By
// default the first candidate renders; individual tests narrow this.
const onlyLoads = (...loadable) =>
  jest
    .spyOn(IconProbe, "firstLoadableIconUrl")
    .mockImplementation(async (urls) =>
      loadable.length ? urls.find((url) => loadable.includes(url)) : urls[0],
    );

beforeEach(() => {
  onlyLoads();
});

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

describe("getIconFromTokenLists candidate selection", () => {
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

  it("uses the first candidate when it loads, matched by issuer", async () => {
    const { icon } = await getIconFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [validAssetList, laterList],
    });

    expect(icon).toEqual(EXPECTED_ICON_URL);
  });

  it("uses the first candidate when it loads, matched by contract ID", async () => {
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

describe("getIconFromTokenLists probing", () => {
  const deadList = {
    ...validAssetList,
    provider: "Dead Provider",
    assets: [
      { ...validAssetList.assets[0], icon: "https://dead.example/icon.png" },
    ],
  };

  it("skips a candidate that does not load and uses the next one", async () => {
    onlyLoads(EXPECTED_ICON_URL);

    const { icon } = await getIconFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [deadList, validAssetList],
    });

    expect(icon).toEqual(EXPECTED_ICON_URL);
  });

  it("returns no icon when nothing on the lists loads", async () => {
    onlyLoads("https://nothing-loads.example/icon.png");

    const { icon } = await getIconFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [deadList, validAssetList],
    });

    expect(icon).toBeUndefined();
  });

  it("caches the icon it confirmed, so other views can trust it", async () => {
    onlyLoads(EXPECTED_ICON_URL);
    const sendSpy = jest.spyOn(ExtensionMessaging, "sendMessageToBackground");
    sendSpy.mockClear();

    await getIconFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [deadList, validAssetList],
    });

    const cacheWrites = sendSpy.mock.calls.filter(
      ([message]) => message?.type === SERVICE_TYPES.CACHE_ASSET_ICON,
    );
    expect(cacheWrites).toHaveLength(1);
    expect(cacheWrites[0][0].iconUrl).toEqual(EXPECTED_ICON_URL);
  });

  it("does not cache anything when no candidate loads", async () => {
    onlyLoads("https://nothing-loads.example/icon.png");
    const sendSpy = jest.spyOn(ExtensionMessaging, "sendMessageToBackground");
    sendSpy.mockClear();

    await getIconFromTokenLists({
      issuerId: VERIFIED_TOKEN_ISSUER,
      code: VERIFIED_TOKEN_CODE,
      assetsListsData: [deadList],
    });

    const cacheWrites = sendSpy.mock.calls.filter(
      ([message]) => message?.type === SERVICE_TYPES.CACHE_ASSET_ICON,
    );
    expect(cacheWrites).toEqual([]);
  });
});
