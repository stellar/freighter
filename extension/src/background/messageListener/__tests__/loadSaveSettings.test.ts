import { loadSettings } from "../handlers/loadSettings";
import { saveSettings } from "../handlers/saveSettings";
import { IS_OPEN_SIDEBAR_BY_DEFAULT_ID } from "constants/localStorageTypes";

jest.mock("background/helpers/account", () => ({
  getAllowList: jest.fn().mockResolvedValue([]),
  getAssetsLists: jest.fn().mockResolvedValue([]),
  getIsExperimentalModeEnabled: jest.fn().mockResolvedValue(false),
  getIsHashSigningEnabled: jest.fn().mockResolvedValue(false),
  getIsHideDustEnabled: jest.fn().mockResolvedValue(true),
  getIsMemoValidationEnabled: jest.fn().mockResolvedValue(true),
  getIsNonSSLEnabled: jest.fn().mockResolvedValue(false),
  getNetworkDetails: jest.fn().mockResolvedValue({
    network: "TESTNET",
    networkName: "Test Net",
    networkUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
  getNetworksList: jest.fn().mockResolvedValue([]),
  verifySorobanRpcUrls: jest.fn().mockResolvedValue(undefined),
  getFeatureFlags: jest.fn().mockResolvedValue({ useSorobanPublic: false }),
  getOverriddenBlockaidResponse: jest.fn().mockResolvedValue(null),
}));

jest.mock("../helpers/get-hidden-assets", () => ({
  getHiddenAssets: jest.fn().mockResolvedValue({ hiddenAssets: {} }),
}));

(global as any).chrome = {
  sidePanel: {
    setPanelBehavior: jest.fn().mockResolvedValue(undefined),
  },
};

describe("loadSettings isOpenSidebarByDefault", () => {
  it('returns true when localStorage value is the string "true"', async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID)
          return Promise.resolve("true");
        return Promise.resolve(null);
      }),
      setItem: jest.fn(),
    } as any;

    const result = await loadSettings({ localStore });
    expect(result.isOpenSidebarByDefault).toBe(true);
  });

  it('returns false when localStorage value is the string "false"', async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID)
          return Promise.resolve("false");
        return Promise.resolve(null);
      }),
      setItem: jest.fn(),
    } as any;

    const result = await loadSettings({ localStore });
    expect(result.isOpenSidebarByDefault).toBe(false);
  });

  it("returns false when localStorage value is null", async () => {
    const localStore = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn(),
    } as any;

    const result = await loadSettings({ localStore });
    expect(result.isOpenSidebarByDefault).toBe(false);
  });
});

describe("saveSettings isOpenSidebarByDefault", () => {
  it("calls setPanelBehavior with the boolean from the request", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID)
          return Promise.resolve("true");
        return Promise.resolve(null);
      }),
      setItem: jest.fn().mockResolvedValue(undefined),
    } as any;

    const request = {
      isDataSharingAllowed: true,
      isMemoValidationEnabled: true,
      isHideDustEnabled: true,
      isOpenSidebarByDefault: true,
    } as any;

    const result = await saveSettings({ request, localStore });

    expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: true,
    });
    expect(result.isOpenSidebarByDefault).toBe(true);
  });

  it('returns boolean false (not the string "false") after saving', async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID)
          return Promise.resolve("false");
        return Promise.resolve(null);
      }),
      setItem: jest.fn().mockResolvedValue(undefined),
    } as any;

    const request = {
      isDataSharingAllowed: true,
      isMemoValidationEnabled: true,
      isHideDustEnabled: true,
      isOpenSidebarByDefault: false,
    } as any;

    const result = await saveSettings({ request, localStore });
    expect(result.isOpenSidebarByDefault).toBe(false);
    // Ensure it's actually a boolean, not the string "false"
    expect(typeof result.isOpenSidebarByDefault).toBe("boolean");
  });
});
