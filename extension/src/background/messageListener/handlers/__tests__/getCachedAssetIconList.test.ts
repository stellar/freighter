import { getCachedAssetIconList } from "../getCachedAssetIconList";

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

  it("returns an empty map when nothing is cached", async () => {
    const result = await getCachedAssetIconList({
      localStore: makeLocalStore(undefined),
    });

    expect(result.icons).toEqual({});
  });
});
