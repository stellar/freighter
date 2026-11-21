import { SERVICE_TYPES } from "@shared/constants/services";
import { getCachedAssetIcon } from "../getCachedAssetIcons";

const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC_ICON = "https://centre.io/usdc.png";

const makeLocalStore = (assetIconCache: unknown) =>
  ({
    getItem: jest.fn(async () => assetIconCache),
    setItem: jest.fn(async () => undefined),
    remove: jest.fn(),
    clear: jest.fn(),
  }) as any;

const read = (existing: unknown) =>
  getCachedAssetIcon({
    request: {
      type: SERVICE_TYPES.GET_CACHED_ASSET_ICON,
      activePublicKey: null,
      assetCanonical: USDC,
    } as any,
    localStore: makeLocalStore(existing),
  });

describe("getCachedAssetIcon", () => {
  it("returns the cached https url", async () => {
    expect(await read({ [USDC]: USDC_ICON })).toEqual({ iconUrl: USDC_ICON });
  });

  it("returns an empty string for a miss", async () => {
    expect(await read({})).toEqual({ iconUrl: "" });
  });

  it("does not serve an entry that fails validation", async () => {
    expect(await read({ [USDC]: "javascript:alert(1)" })).toEqual({
      iconUrl: "",
    });
  });
});
