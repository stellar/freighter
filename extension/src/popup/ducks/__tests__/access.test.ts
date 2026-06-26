import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { captureException } from "@sentry/browser";

import {
  grantAccess as internalGrantAccess,
  loadSettings as internalLoadSettings,
} from "@shared/api/internal";
import { DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES } from "@shared/constants/autoLock";
import { SettingsState } from "@shared/api/types";
import { reducer as authReducer } from "../accountServices";
import { reducer as settingsReducer } from "../settings";
import { grantAccess } from "../access";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  grantAccess: jest.fn(),
  loadSettings: jest.fn(),
}));

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

const TESTNET = {
  network: "TESTNET",
  networkName: "Testnet",
  networkUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

const makeStore = () =>
  configureStore({
    reducer: combineReducers({ auth: authReducer, settings: settingsReducer }),
    preloadedState: {
      auth: {
        allAccounts: [],
        migratedAccounts: [],
        applicationState: "APPLICATION_STARTED",
        hasPrivateKey: true,
        publicKey: "GBTEST",
        connectingWalletType: "NONE",
        bipPath: "",
        tokenIdList: [],
        error: "",
        accountStatus: "IDLE",
        isAccountMismatch: false,
      },
    } as any,
  });

// The settings refresh is fire-and-forget (not awaited by the thunk), so it
// lands a tick after the thunk fulfills. Flush pending microtasks before
// asserting on its effects.
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("grantAccess thunk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression: in sidebar mode the popup React tree (and its redux
  // store) is reused across consecutive signing flows because
  // openSigningWindow's sidebar branch just `postMessage`s a
  // SIDEBAR_NAVIGATE to the existing port. Without an explicit refresh
  // here, the post-grant SignMessage / SignAuthEntry view reads a stale
  // popup-side allowList and renders "not connected" even though the
  // backend just wrote the new domain to localStore.
  it("refreshes popup-side settings (and allowList) after a successful grantAccess", async () => {
    (internalGrantAccess as jest.Mock).mockResolvedValueOnce(undefined);
    (internalLoadSettings as jest.Mock).mockResolvedValueOnce({
      allowList: { Testnet: { GBTEST: ["dapp.example"] } },
      isDataSharingAllowed: true,
      isMemoValidationEnabled: true,
      isHideDustEnabled: true,
      isOpenSidebarByDefault: false,
      autoLockTimeoutMinutes: DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
      networkDetails: TESTNET,
      networksList: [],
      isRpcHealthy: true,
      isSorobanPublicEnabled: false,
      isNonSSLEnabled: false,
      isExperimentalModeEnabled: false,
      isHashSigningEnabled: false,
      assetsLists: {},
      settingsState: SettingsState.SUCCESS,
      userNotification: { enabled: false, message: "" },
    });

    const store = makeStore();
    await (store.dispatch as any)(
      grantAccess({ url: "https://dapp.example", uuid: "uuid-1" }),
    );
    // The refresh dispatches saveSettingsAction asynchronously after the
    // thunk fulfills; wait for it to land before asserting on redux state.
    await flushPromises();

    expect(internalGrantAccess).toHaveBeenCalledWith({
      url: "https://dapp.example",
      uuid: "uuid-1",
    });
    expect(internalLoadSettings).toHaveBeenCalledTimes(1);

    const state = store.getState() as any;
    expect(state.settings.allowList).toEqual({
      Testnet: { GBTEST: ["dapp.example"] },
    });
    // Order: backend grant runs before settings refresh, so the
    // refreshed allowList in redux reflects the just-granted domain.
    const grantCall = (internalGrantAccess as jest.Mock).mock
      .invocationCallOrder[0];
    const loadCall = (internalLoadSettings as jest.Mock).mock
      .invocationCallOrder[0];
    expect(grantCall).toBeLessThan(loadCall);
  });

  // The refresh is best-effort: if loadSettings throws (transient MV3
  // service-worker hiccup) we swallow it rather than rejecting the
  // thunk, since the backend grant has already succeeded and a stale
  // popup allowList is a strictly better state than failing the grant.
  it("swallows a loadSettings error so the grant still fulfills", async () => {
    (internalGrantAccess as jest.Mock).mockResolvedValueOnce(undefined);
    const loadError = new Error("transient SW restart");
    (internalLoadSettings as jest.Mock).mockRejectedValueOnce(loadError);

    const store = makeStore();
    const action = await (store.dispatch as any)(
      grantAccess({ url: "https://dapp.example", uuid: "uuid-2" }),
    );

    // The grant fulfills regardless of the refresh outcome.
    expect(action.type).toBe("grantAccess/fulfilled");
    expect(internalLoadSettings).toHaveBeenCalledTimes(1);

    // The failure is reported to Sentry asynchronously, after the thunk
    // has already fulfilled.
    await flushPromises();
    expect(captureException).toHaveBeenCalledWith(loadError, {
      extra: { context: "grantAccess: failed to refresh settings" },
    });
  });
});
