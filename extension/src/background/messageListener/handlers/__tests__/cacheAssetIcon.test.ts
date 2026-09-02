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

describe("cacheAssetIcon concurrency", () => {
  /**
   * localStore whose reads are held open until released, so every handler is
   * guaranteed to have read before any of them writes — the interleaving that
   * concurrent icon resolution produces, made deterministic.
   *
   * Reads hand back a copy, as browser.storage.local does: one handler's
   * mutation is invisible to another that already read.
   */
  const makeGatedLocalStore = (
    assetIconCache: Record<string, unknown> = {},
  ) => {
    const store: Record<string, unknown> = {
      [CACHED_ASSET_ICONS_ID]: assetIconCache,
    };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    return {
      localStore: {
        getItem: jest.fn(async (key: string) => {
          await gate;
          return store[key] === undefined
            ? undefined
            : JSON.parse(JSON.stringify(store[key]));
        }),
        setItem: jest.fn(async (key: string, value: unknown) => {
          store[key] = value;
        }),
        remove: jest.fn(),
        clear: jest.fn(),
      } as any,
      releaseReads: () => release(),
      read: () => store,
    };
  };

  it("keeps every icon when writes overlap", async () => {
    // getAssetIcons resolves icons concurrently, so several CACHE_ASSET_ICON
    // messages are in flight at once. A read-modify-write of one shared object
    // loses all but the last unless the writes are serialized.
    const { localStore, releaseReads, read } = makeGatedLocalStore();

    const writes = Promise.all(
      ["A:G1", "B:G2", "C:G3"].map((assetCanonical) =>
        cacheAssetIcon({
          request: {
            assetCanonical,
            iconUrl: `https://example.com/${assetCanonical}.png`,
          } as CacheAssetIconMessage,
          localStore,
        }),
      ),
    );
    releaseReads();
    await writes;

    expect(read()[CACHED_ASSET_ICONS_ID]).toEqual({
      "A:G1": "https://example.com/A:G1.png",
      "B:G2": "https://example.com/B:G2.png",
      "C:G3": "https://example.com/C:G3.png",
    });
  });

  it("does not let an overlapping write resurrect a cleared entry", async () => {
    const { localStore, releaseReads, read } = makeGatedLocalStore({
      [CANONICAL]: ICON_URL,
    });

    const writes = Promise.all([
      cacheAssetIcon({
        request: {
          assetCanonical: CANONICAL,
          iconUrl: null,
        } as CacheAssetIconMessage,
        localStore,
      }),
      cacheAssetIcon({
        request: {
          assetCanonical: OTHER_CANONICAL,
          iconUrl: OTHER_ICON_URL,
        } as CacheAssetIconMessage,
        localStore,
      }),
    ]);
    releaseReads();
    await writes;

    expect(read()[CACHED_ASSET_ICONS_ID]).toEqual({
      [OTHER_CANONICAL]: OTHER_ICON_URL,
    });
  });
});
