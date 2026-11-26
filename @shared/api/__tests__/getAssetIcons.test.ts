import { getAssetIcons } from "@shared/api/internal";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";

jest.mock("@shared/api/helpers/extensionMessaging");

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${ISSUER}`;
const LIST_ICON = "https://list.example/usdc.png";
const CACHED_ICON = "https://issuer.example/usdc.png";

const balances = {
  [USDC]: {
    token: { code: "USDC", issuer: { key: ISSUER } },
    total: "1",
    available: "1",
  },
} as any;

const assetsListsData = [
  {
    name: "List",
    description: "",
    network: "public",
    version: "1",
    provider: "test",
    assets: [{ code: "USDC", issuer: ISSUER, icon: LIST_ICON }],
  },
] as any;

describe("getAssetIcons", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps a cached icon over the token-list one and sends no write", async () => {
    // e.g. the list icon is dead and retryAssetIcon cached the toml's icon
    const icons = await getAssetIcons({
      balances,
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsListsData,
      cachedIcons: { [USDC]: CACHED_ICON },
    });

    expect(icons[USDC]).toBe(CACHED_ICON);
    expect(sendMessageToBackground).not.toHaveBeenCalled();
  });

  it("caches a token-list icon on a cache miss", async () => {
    const icons = await getAssetIcons({
      balances,
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsListsData,
      cachedIcons: {},
    });

    expect(icons[USDC]).toBe(LIST_ICON);
    expect(sendMessageToBackground).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CACHE_ASSET_ICON",
        assetCanonical: USDC,
        iconUrl: LIST_ICON,
      }),
    );
  });

  it("still returns the list icon when the cache write fails", async () => {
    (sendMessageToBackground as jest.Mock).mockRejectedValueOnce(
      new Error("port closed"),
    );
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const icons = await getAssetIcons({
      balances,
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsListsData,
      cachedIcons: {},
    });

    expect(icons[USDC]).toBe(LIST_ICON);
    consoleError.mockRestore();
  });

  it("keeps a cached icon over the token-list one for an unheld extra", async () => {
    const icons = await getAssetIcons({
      balances: {} as any,
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsListsData,
      cachedIcons: { [USDC]: CACHED_ICON },
      additionalAssetIds: [USDC],
    });

    expect(icons[USDC]).toBe(CACHED_ICON);
    expect(sendMessageToBackground).not.toHaveBeenCalled();
  });

  it("caches a token-list icon for an unheld extra on a cache miss", async () => {
    const icons = await getAssetIcons({
      balances: {} as any,
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsListsData,
      cachedIcons: {},
      additionalAssetIds: [USDC],
    });

    expect(icons[USDC]).toBe(LIST_ICON);
    expect(sendMessageToBackground).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CACHE_ASSET_ICON",
        assetCanonical: USDC,
        iconUrl: LIST_ICON,
      }),
    );
  });

  it("serves the cached icon when the lists are not consulted", async () => {
    const icons = await getAssetIcons({
      balances,
      cachedIcons: { [USDC]: CACHED_ICON },
    });

    expect(icons[USDC]).toBe(CACHED_ICON);
  });

  it("serves the cached icon when the lists do not carry the asset", async () => {
    const icons = await getAssetIcons({
      balances,
      networkDetails: MAINNET_NETWORK_DETAILS,
      assetsListsData: [{ ...assetsListsData[0], assets: [] }],
      cachedIcons: { [USDC]: CACHED_ICON },
    });

    expect(icons[USDC]).toBe(CACHED_ICON);
  });
});
