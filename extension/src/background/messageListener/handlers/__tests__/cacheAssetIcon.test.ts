import { SERVICE_TYPES } from "@shared/constants/services";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";
import { MAX_CACHED_ASSET_ICONS } from "background/helpers/assetIconCache";
import { cacheAssetIcon } from "../cacheAssetIcon";

const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC_ICON = "https://centre.io/usdc.png";

const makeLocalStore = (assetIconCache: unknown) =>
  ({
    getItem: jest.fn(async () => assetIconCache),
    setItem: jest.fn(async () => undefined),
    remove: jest.fn(),
    clear: jest.fn(),
  }) as any;

const cache = async (iconUrl: unknown, existing: unknown = {}) => {
  const localStore = makeLocalStore(existing);
  await cacheAssetIcon({
    request: {
      type: SERVICE_TYPES.CACHE_ASSET_ICON,
      activePublicKey: null,
      assetCanonical: USDC,
      iconUrl,
    } as any,
    localStore,
  });
  return localStore;
};

const lastWrite = (localStore: any) =>
  localStore.setItem.mock.calls[localStore.setItem.mock.calls.length - 1][1];

describe("cacheAssetIcon", () => {
  it("stores an https url", async () => {
    const localStore = await cache(USDC_ICON);

    expect(localStore.setItem).toHaveBeenCalledWith(CACHED_ASSET_ICONS_ID, {
      [USDC]: USDC_ICON,
    });
  });

  it("removes the entry when sent null, which retryAssetIcon uses to clear it", async () => {
    const localStore = await cache(null, {
      [USDC]: USDC_ICON,
      "A:GA": "https://icons.example/a.png",
    });

    expect(lastWrite(localStore)).toEqual({
      "A:GA": "https://icons.example/a.png",
    });
  });

  it("does not write when sent null for an unknown canonical", async () => {
    const localStore = await cache(null, {
      "A:GA": "https://icons.example/a.png",
    });

    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("does not write when the stored value already matches", async () => {
    const localStore = await cache(USDC_ICON, { [USDC]: USDC_ICON });

    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["http:", "http://centre.io/usdc.png"],
    ["data:", "data:image/png;base64,AAAA"],
    ["not a url", "usdc.png"],
    ["a number", 42],
    ["an object", { href: USDC_ICON }],
    ["undefined", undefined],
  ])("drops %s without writing", async (_label, iconUrl) => {
    const localStore = await cache(iconUrl);

    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("drops a url longer than 2048 characters", async () => {
    const localStore = await cache(`https://centre.io/${"a".repeat(2048)}.png`);

    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("stores the parsed href, which has no characters storage.local would escape", async () => {
    // Chrome counts the JSON-serialised value against the quota and escapes
    // `<` as a six-character unicode escape, so a raw string could cost six
    // times its length.
    const localStore = await cache("https://centre.io/<<<<.png?q=<>");

    const stored = lastWrite(localStore)[USDC];
    expect(stored).toBe("https://centre.io/%3C%3C%3C%3C.png?q=%3C%3E");
    expect(JSON.stringify(stored)).toBe(`"${stored}"`);
  });

  it("evicts the oldest entries once the map passes the cap", async () => {
    const existing: Record<string, string> = {};
    for (let i = 0; i < MAX_CACHED_ASSET_ICONS; i += 1) {
      existing[`X${i}:GISSUER${i}`] = `https://icons.example/${i}.png`;
    }

    const localStore = await cache(USDC_ICON, existing);

    const stored = lastWrite(localStore);
    expect(Object.keys(stored)).toHaveLength(MAX_CACHED_ASSET_ICONS);
    expect(stored["X0:GISSUER0"]).toBeUndefined();
    expect(stored["X1:GISSUER1"]).toBe("https://icons.example/1.png");
    expect(stored[USDC]).toBe(USDC_ICON);
  });

  it("drops existing entries that fail validation", async () => {
    const localStore = await cache(USDC_ICON, {
      "A:GA": "javascript:alert(1)",
      "B:GB": `https://icons.example/${"b".repeat(3000)}.png`,
      "C:GC": 42,
      "D:GD": null,
      "E:GE": "https://icons.example/e.png",
    });

    expect(lastWrite(localStore)).toEqual({
      "E:GE": "https://icons.example/e.png",
      [USDC]: USDC_ICON,
    });
  });

  it("re-caching an existing canonical makes it the newest entry", async () => {
    const localStore = await cache("https://centre.io/new.png", {
      [USDC]: USDC_ICON,
      "A:GA": "https://icons.example/a.png",
    });

    expect(Object.keys(lastWrite(localStore))).toEqual(["A:GA", USDC]);
  });

  it("serialises concurrent writes so none is lost", async () => {
    // getAssetIcons fires one message per listed asset without awaiting;
    // the handlers would otherwise all read the same snapshot.
    const data: Record<string, unknown> = {};
    const localStore = {
      getItem: jest.fn(async (key: string) => {
        const snapshot = data[key];
        await new Promise((resolve) => setTimeout(resolve, 0));
        return snapshot;
      }),
      setItem: jest.fn(async (key: string, value: unknown) => {
        data[key] = value;
      }),
      remove: jest.fn(),
      clear: jest.fn(),
      getAllKeys: jest.fn(),
    };
    const send = (assetCanonical: string, iconUrl: string) =>
      cacheAssetIcon({
        request: {
          type: SERVICE_TYPES.CACHE_ASSET_ICON,
          activePublicKey: null,
          assetCanonical,
          iconUrl,
        } as any,
        localStore,
      });

    await Promise.all([
      send("A:GA", "https://icons.example/a.png"),
      send("B:GB", "https://icons.example/b.png"),
    ]);

    expect(data[CACHED_ASSET_ICONS_ID]).toEqual({
      "A:GA": "https://icons.example/a.png",
      "B:GB": "https://icons.example/b.png",
    });
  });
});
