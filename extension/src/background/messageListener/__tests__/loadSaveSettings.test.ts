import { loadSettings } from "../handlers/loadSettings";
import { saveSettings } from "../handlers/saveSettings";
import {
  AUTO_LOCK_TIMEOUT_MINUTES_ID,
  IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";
import { DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES } from "@shared/constants/autoLock";
import browser from "webextension-polyfill";

const alarmsGet = jest.fn();
const alarmsCreate = jest.fn().mockResolvedValue(undefined);
const alarmsClear = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  alarmsGet.mockReset();
  alarmsCreate.mockClear();
  alarmsClear.mockClear();
  (browser as any).alarms = {
    get: alarmsGet,
    create: alarmsCreate,
    clear: alarmsClear,
  };
});

jest.mock("background/helpers/account", () => ({
  getAllowList: jest.fn().mockResolvedValue([]),
  getAssetsLists: jest.fn().mockResolvedValue([]),
  getIsExperimentalModeEnabled: jest.fn().mockResolvedValue(false),
  getIsHashSigningEnabled: jest.fn().mockResolvedValue(false),
  getIsHideDustEnabled: jest.fn().mockResolvedValue(true),
  getIsMemoValidationEnabled: jest.fn().mockResolvedValue(true),
  getIsNonSSLEnabled: jest.fn().mockResolvedValue(false),
  getIsHardwareWalletActive: jest.fn().mockResolvedValue(false),
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
  it("returns true when storage value is boolean true", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID) return Promise.resolve(true);
        return Promise.resolve(null);
      }),
      setItem: jest.fn(),
    } as any;

    const result = await loadSettings({ localStore });
    expect(result.isOpenSidebarByDefault).toBe(true);
  });

  it("returns false when storage value is boolean false", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID)
          return Promise.resolve(false);
        return Promise.resolve(null);
      }),
      setItem: jest.fn(),
    } as any;

    const result = await loadSettings({ localStore });
    expect(result.isOpenSidebarByDefault).toBe(false);
  });

  it("returns false when storage value is null", async () => {
    const localStore = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn(),
    } as any;

    const result = await loadSettings({ localStore });
    expect(result.isOpenSidebarByDefault).toBe(false);
  });
});

describe("saveSettings isOpenSidebarByDefault", () => {
  const makeSessionStore = (hashKey: string | null = null) =>
    ({
      getState: () => ({
        session: hashKey ? { hashKey: { key: hashKey, salt: "s" } } : {},
      }),
    }) as any;

  const makeSessionTimer = () =>
    ({
      resetSession: jest.fn().mockResolvedValue(undefined),
      startSession: jest.fn().mockResolvedValue(undefined),
      stopSession: jest.fn().mockResolvedValue(undefined),
    }) as any;

  it("calls setPanelBehavior with the boolean from the request", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID) return Promise.resolve(true);
        if (key === AUTO_LOCK_TIMEOUT_MINUTES_ID) return Promise.resolve(15);
        return Promise.resolve(null);
      }),
      setItem: jest.fn().mockResolvedValue(undefined),
    } as any;

    const request = {
      isDataSharingAllowed: true,
      isMemoValidationEnabled: true,
      isHideDustEnabled: true,
      isOpenSidebarByDefault: true,
      autoLockTimeoutMinutes: 15,
    } as any;

    const result = await saveSettings({
      request,
      localStore,
      sessionStore: makeSessionStore(),
      sessionTimer: makeSessionTimer(),
    });

    expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: true,
    });
    expect(result.isOpenSidebarByDefault).toBe(true);
  });

  it("returns boolean false after saving false", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID)
          return Promise.resolve(false);
        if (key === AUTO_LOCK_TIMEOUT_MINUTES_ID) return Promise.resolve(15);
        return Promise.resolve(null);
      }),
      setItem: jest.fn().mockResolvedValue(undefined),
    } as any;

    const request = {
      isDataSharingAllowed: true,
      isMemoValidationEnabled: true,
      isHideDustEnabled: true,
      isOpenSidebarByDefault: false,
      autoLockTimeoutMinutes: 15,
    } as any;

    const result = await saveSettings({
      request,
      localStore,
      sessionStore: makeSessionStore(),
      sessionTimer: makeSessionTimer(),
    });
    expect(result.isOpenSidebarByDefault).toBe(false);
    expect(typeof result.isOpenSidebarByDefault).toBe("boolean");
  });
});

describe("saveSettings autoLockTimeoutMinutes", () => {
  const makeSessionStore = (hashKey: string | null = null) =>
    ({
      getState: () => ({
        session: hashKey ? { hashKey: { key: hashKey, salt: "s" } } : {},
      }),
    }) as any;

  const makeSessionTimer = () =>
    ({
      resetSession: jest.fn().mockResolvedValue(undefined),
      startSession: jest.fn().mockResolvedValue(undefined),
      stopSession: jest.fn().mockResolvedValue(undefined),
    }) as any;

  const makeLocalStore = (
    storedTimeout: number | null = 15,
    hasTempStore: boolean = true,
  ) =>
    ({
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === AUTO_LOCK_TIMEOUT_MINUTES_ID)
          return Promise.resolve(storedTimeout);
        if (key === IS_OPEN_SIDEBAR_BY_DEFAULT_ID)
          return Promise.resolve(false);
        if (key === TEMPORARY_STORE_ID) {
          return Promise.resolve(
            hasTempStore ? { "key-id-0": "encrypted-blob" } : null,
          );
        }
        return Promise.resolve(null);
      }),
      setItem: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    }) as any;

  const baseRequest = {
    isDataSharingAllowed: true,
    isMemoValidationEnabled: true,
    isHideDustEnabled: true,
    isOpenSidebarByDefault: false,
  };

  it("rejects invalid autoLockTimeoutMinutes values", async () => {
    const localStore = makeLocalStore();
    const result = await saveSettings({
      request: { ...baseRequest, autoLockTimeoutMinutes: 7 } as any,
      localStore,
      sessionStore: makeSessionStore(),
      sessionTimer: makeSessionTimer(),
    });
    expect((result as any).error).toBe("Invalid autoLockTimeoutMinutes");
    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("rejects non-numeric autoLockTimeoutMinutes", async () => {
    const result = await saveSettings({
      request: { ...baseRequest, autoLockTimeoutMinutes: "15" } as any,
      localStore: makeLocalStore(),
      sessionStore: makeSessionStore(),
      sessionTimer: makeSessionTimer(),
    });
    expect((result as any).error).toBe("Invalid autoLockTimeoutMinutes");
  });

  it("persists a valid timeout and reschedules when unlocked", async () => {
    const localStore = makeLocalStore(30);
    const sessionTimer = makeSessionTimer();

    const result = await saveSettings({
      request: { ...baseRequest, autoLockTimeoutMinutes: 30 } as any,
      localStore,
      sessionStore: makeSessionStore("hash-key"),
      sessionTimer,
    });

    expect(localStore.setItem).toHaveBeenCalledWith(
      AUTO_LOCK_TIMEOUT_MINUTES_ID,
      30,
    );
    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
    expect((result as any).autoLockTimeoutMinutes).toBe(30);
    expect((result as any).wasLocked).toBeUndefined();
  });

  it("does not reschedule the timer when the wallet is locked", async () => {
    const sessionTimer = makeSessionTimer();
    await saveSettings({
      request: { ...baseRequest, autoLockTimeoutMinutes: 5 } as any,
      localStore: makeLocalStore(5, false),
      sessionStore: makeSessionStore(null),
      sessionTimer,
    });
    expect(sessionTimer.resetSession).not.toHaveBeenCalled();
    expect(sessionTimer.stopSession).not.toHaveBeenCalled();
  });

  it("rearms (rather than locking) when the user shortens the timeout", async () => {
    // Saving settings is itself a user action, so shortening the
    // timeout should restart the idle clock with the new value rather
    // than synthesizing an immediate lock — even when the new threshold
    // is already smaller than the elapsed idle time of the in-flight
    // alarm. Set up `alarmsGet` to return an alarm whose remaining time
    // (1 min) is much less than the new 5 min timeout, i.e. elapsed
    // idle (59 min) ≫ new timeout (5 min). The previous implementation
    // would have detected this and locked immediately; the current
    // implementation must simply rearm.
    alarmsGet.mockResolvedValue({
      scheduledTime: Date.now() + 1 * 60_000,
    });
    const localStore = makeLocalStore(60);
    const sessionTimer = makeSessionTimer();
    const sessionStore = {
      getState: () => ({ session: { hashKey: { key: "k" } } }),
      dispatch: jest.fn(),
    } as any;

    const result = await saveSettings({
      request: { ...baseRequest, autoLockTimeoutMinutes: 5 } as any,
      localStore,
      sessionStore,
      sessionTimer,
    });

    expect(sessionTimer.resetSession).toHaveBeenCalledTimes(1);
    expect(sessionTimer.stopSession).not.toHaveBeenCalled();
    expect(sessionStore.dispatch).not.toHaveBeenCalled();
    expect((result as any).wasLocked).toBeUndefined();
  });
});

describe("loadSettings autoLockTimeoutMinutes", () => {
  it("returns the stored timeout when valid", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === AUTO_LOCK_TIMEOUT_MINUTES_ID) return Promise.resolve(30);
        return Promise.resolve(null);
      }),
      setItem: jest.fn(),
    } as any;
    const result = await loadSettings({ localStore });
    expect(result.autoLockTimeoutMinutes).toBe(30);
  });

  it("falls back to the default when storage is empty", async () => {
    const localStore = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn(),
    } as any;
    const result = await loadSettings({ localStore });
    expect(result.autoLockTimeoutMinutes).toBe(
      DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
    );
  });

  it("falls back to the default when storage holds an invalid value", async () => {
    const localStore = {
      getItem: jest.fn().mockImplementation((key: string) => {
        if (key === AUTO_LOCK_TIMEOUT_MINUTES_ID) return Promise.resolve(7);
        return Promise.resolve(null);
      }),
      setItem: jest.fn(),
    } as any;
    const result = await loadSettings({ localStore });
    expect(result.autoLockTimeoutMinutes).toBe(
      DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
    );
  });
});
