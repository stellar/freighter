import { combineReducers, configureStore } from "@reduxjs/toolkit";

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
    (internalLoadSettings as jest.Mock).mockRejectedValueOnce(
      new Error("transient SW restart"),
    );
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const store = makeStore();
    const action = await (store.dispatch as any)(
      grantAccess({ url: "https://dapp.example", uuid: "uuid-2" }),
    );

    expect(action.type).toBe("grantAccess/fulfilled");
    expect(internalLoadSettings).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
