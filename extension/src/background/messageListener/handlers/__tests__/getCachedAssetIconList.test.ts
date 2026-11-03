import { getCachedAssetIconList } from "../getCachedAssetIconList";

const USDT0 = "USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC_ICON = "https://centre.io/usdc.png";

const makeLocalStore = (assetIconCache: unknown) =>
  ({
    getItem: jest.fn(async () => assetIconCache),
    setItem: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  }) as any;

describe("getCachedAssetIconList", () => {
  it("returns the icons it has", async () => {
    const result = await getCachedAssetIconList({
      localStore: makeLocalStore({ [USDC]: USDC_ICON }),
    });

    expect(result.icons).toEqual({ [USDC]: USDC_ICON });
  });

  it("leaves out assets recorded as having no icon", async () => {
    // A null here means an earlier lookup came up empty, and getAssetIcons
    // reads it as "already tried, don't look again". Because this cache is on
    // disk that verdict outlived the session, so an asset whose icon failed
    // once — USDT0, whose LOBSTR url 403s browsers — stayed iconless forever.
    // Dropping nulls turns it back into an ordinary cache miss, and the fresh
    // lookup overwrites the stale entry.
    const result = await getCachedAssetIconList({
      localStore: makeLocalStore({ [USDC]: USDC_ICON, [USDT0]: null }),
    });

    expect(result.icons).toEqual({ [USDC]: USDC_ICON });
  });

  it("returns an empty map when nothing is cached", async () => {
    const result = await getCachedAssetIconList({
      localStore: makeLocalStore(undefined),
    });

    expect(result.icons).toEqual({});
  });
});
