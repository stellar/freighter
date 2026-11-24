import {
  CACHED_ASSET_ICONS_ID,
  STORAGE_VERSION,
} from "constants/localStorageTypes";
import { MAX_CACHED_ASSET_ICONS } from "../assetIconCache";
import { migrateAssetIconCache } from "../dataStorage";

const USDT0 = "USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC_ICON = "https://centre.io/usdc.png";

const makeLocalStore = (items: Record<string, unknown>) => {
  const data = { ...items };
  return {
    data,
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      data[key] = value;
    }),
    remove: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
  };
};

describe("migrateAssetIconCache", () => {
  it("drops nulls, invalid entries and over-length keys and bumps the version", async () => {
    const localStore = makeLocalStore({
      [STORAGE_VERSION]: "5.33.5",
      [CACHED_ASSET_ICONS_ID]: {
        [USDT0]: null,
        "A:GA": "javascript:alert(1)",
        "B:GB": `https://icons.example/${"b".repeat(3000)}.png`,
        "C:GC": 42,
        [`${"S".repeat(300)}:CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`]:
          "https://icons.example/s.png",
        [USDC]: USDC_ICON,
      },
    });

    await migrateAssetIconCache(localStore);

    expect(localStore.data[CACHED_ASSET_ICONS_ID]).toEqual({
      [USDC]: USDC_ICON,
    });
    expect(localStore.data[STORAGE_VERSION]).toBe("5.53.0");
  });

  it("evicts the oldest entries past the cap", async () => {
    const existing: Record<string, string> = {};
    for (let i = 0; i < MAX_CACHED_ASSET_ICONS + 2; i += 1) {
      existing[`X${i}:GISSUER${i}`] = `https://icons.example/${i}.png`;
    }
    const localStore = makeLocalStore({ [CACHED_ASSET_ICONS_ID]: existing });

    await migrateAssetIconCache(localStore);

    const icons = localStore.data[CACHED_ASSET_ICONS_ID] as Record<
      string,
      string
    >;
    expect(Object.keys(icons)).toHaveLength(MAX_CACHED_ASSET_ICONS);
    expect(icons["X1:GISSUER1"]).toBeUndefined();
    expect(icons["X2:GISSUER2"]).toBe("https://icons.example/2.png");
  });

  it("runs once", async () => {
    const localStore = makeLocalStore({
      [STORAGE_VERSION]: "5.53.0",
      [CACHED_ASSET_ICONS_ID]: { [USDT0]: null },
    });

    await migrateAssetIconCache(localStore);

    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("leaves the version alone when the rewrite fails, so the next update retries", async () => {
    const localStore = makeLocalStore({
      [STORAGE_VERSION]: "5.33.5",
      [CACHED_ASSET_ICONS_ID]: { [USDT0]: null },
    });
    localStore.setItem.mockRejectedValueOnce(new Error("QUOTA_BYTES"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await migrateAssetIconCache(localStore);

      expect(localStore.setItem).toHaveBeenCalledWith(
        CACHED_ASSET_ICONS_ID,
        {},
      );
      expect(localStore.data[STORAGE_VERSION]).toBe("5.33.5");
    } finally {
      consoleError.mockRestore();
    }
  });
});
