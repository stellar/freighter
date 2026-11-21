import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";
import { MAX_CACHED_ASSET_ICONS } from "background/helpers/assetIconCache";
import { getCachedAssetIconList } from "../getCachedAssetIconList";

const USDT0 = "USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC_ICON = "https://centre.io/usdc.png";

const makeLocalStore = (assetIconCache: unknown) =>
  ({
    getItem: jest.fn(async () => assetIconCache),
    setItem: jest.fn(async () => undefined),
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

  it("does not write back a map that is already valid", async () => {
    const localStore = makeLocalStore({ [USDC]: USDC_ICON });
    await getCachedAssetIconList({ localStore });

    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("writes back a map it had to heal, so storage shrinks without a cache write", async () => {
    // A wallet whose held assets are all cached never sends CACHE_ASSET_ICON,
    // so the read path is the only chance to bring an old oversized map
    // under the bound.
    const localStore = makeLocalStore({
      [USDT0]: null,
      "A:GA": "javascript:alert(1)",
      "B:GB": `https://icons.example/${"b".repeat(3000)}.png`,
      [USDC]: USDC_ICON,
    });
    const result = await getCachedAssetIconList({ localStore });

    expect(result.icons).toEqual({ [USDC]: USDC_ICON });
    expect(localStore.setItem).toHaveBeenCalledWith(CACHED_ASSET_ICONS_ID, {
      [USDC]: USDC_ICON,
    });
  });

  it("still returns the icons when the healed map cannot be written back", async () => {
    const localStore = makeLocalStore({
      "A:GA": "javascript:alert(1)",
      [USDC]: USDC_ICON,
    });
    localStore.setItem.mockRejectedValue(new Error("QUOTA_BYTES"));
    const result = await getCachedAssetIconList({ localStore });

    expect(result.icons).toEqual({ [USDC]: USDC_ICON });
  });

  it("evicts the oldest entries past the cap on read", async () => {
    const existing: Record<string, string> = {};
    for (let i = 0; i < MAX_CACHED_ASSET_ICONS + 2; i += 1) {
      existing[`X${i}:GISSUER${i}`] = `https://icons.example/${i}.png`;
    }
    const localStore = makeLocalStore(existing);
    const result = await getCachedAssetIconList({ localStore });

    expect(Object.keys(result.icons)).toHaveLength(MAX_CACHED_ASSET_ICONS);
    expect(result.icons["X0:GISSUER0"]).toBeUndefined();
    expect(result.icons["X1:GISSUER1"]).toBeUndefined();
    expect(result.icons["X2:GISSUER2"]).toBe("https://icons.example/2.png");
    expect(localStore.setItem).toHaveBeenCalledWith(
      CACHED_ASSET_ICONS_ID,
      result.icons,
    );
  });
});
