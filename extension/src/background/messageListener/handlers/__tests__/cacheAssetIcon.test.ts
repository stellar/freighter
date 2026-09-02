import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";
import { CacheAssetIconMessage } from "@shared/api/types/message-request";
import { cacheAssetIcon } from "../cacheAssetIcon";

const CANONICAL =
  "USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q";
const OTHER_CANONICAL =
  "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const ICON_URL =
  "https://docs.usdt0.to/downloads/usdt0/Symbol_USDT0_Secondary.png";
const OTHER_ICON_URL = "https://centre.io/images/usdc/usdc-icon-86074d9d49.png";

const makeLocalStore = (assetIconCache: Record<string, unknown> = {}) => {
  const store: Record<string, unknown> = {
    [CACHED_ASSET_ICONS_ID]: assetIconCache,
  };
  return {
    getItem: jest.fn(async (key: string) => store[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    remove: jest.fn(),
    clear: jest.fn(),
    read: () => store,
  } as any;
};

describe("cacheAssetIcon", () => {
  it("stores a resolved icon url under its canonical asset", async () => {
    const localStore = makeLocalStore();

    await cacheAssetIcon({
      request: {
        assetCanonical: CANONICAL,
        iconUrl: ICON_URL,
      } as CacheAssetIconMessage,
      localStore,
    });

    expect(localStore.read()[CACHED_ASSET_ICONS_ID]).toEqual({
      [CANONICAL]: ICON_URL,
    });
  });

  it("deletes the entry instead of persisting null when the icon is cleared", async () => {
    // Regression: retryAssetIcon clears a stale icon by sending iconUrl: null.
    // Persisting that null made getAssetIcons skip the asset on every later
    // load ("we've tried before, don't retry"), permanently blacklisting any
    // asset whose icon url failed to load once.
    const localStore = makeLocalStore({
      [CANONICAL]: ICON_URL,
      [OTHER_CANONICAL]: OTHER_ICON_URL,
    });

    await cacheAssetIcon({
      request: {
        assetCanonical: CANONICAL,
        iconUrl: null,
      } as CacheAssetIconMessage,
      localStore,
    });

    expect(localStore.read()[CACHED_ASSET_ICONS_ID]).toEqual({
      [OTHER_CANONICAL]: OTHER_ICON_URL,
    });
  });
});
