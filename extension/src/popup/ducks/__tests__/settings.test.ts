import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES } from "@shared/constants/autoLock";
import { saveSettings as saveSettingsService } from "@shared/api/internal";
import { SettingsState } from "@shared/api/types";
import { reducer as authReducer } from "../accountServices";
import { reducer as settingsReducer, saveSettings } from "../settings";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  saveSettings: jest.fn(),
}));

const makeSettingsResponse = (wasLocked?: boolean) => ({
  allowList: {},
  isDataSharingAllowed: true,
  isMemoValidationEnabled: true,
  isHideDustEnabled: true,
  isOpenSidebarByDefault: false,
  autoLockTimeoutMinutes: DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
  networkDetails: {
    network: "TESTNET",
    networkName: "Testnet",
    networkUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  networksList: [],
  isRpcHealthy: true,
  isSorobanPublicEnabled: false,
  settingsState: SettingsState.SUCCESS,
  userNotification: { enabled: false, message: "" },
  wasLocked,
});

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

const request = {
  isDataSharingAllowed: true,
  isMemoValidationEnabled: true,
  isHideDustEnabled: true,
  isOpenSidebarByDefault: false,
  autoLockTimeoutMinutes: DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
};

describe("settings saveSettings thunk", () => {
  beforeEach(() => {
    (saveSettingsService as jest.Mock).mockReset();
  });

  it("dispatches lockAccount when the background reports an immediate lock", async () => {
    (saveSettingsService as jest.Mock).mockResolvedValue(
      makeSettingsResponse(true),
    );
    const store = makeStore();

    await store.dispatch(saveSettings(request) as any);

    expect(store.getState().auth.hasPrivateKey).toBe(false);
  });

  it.each([false, undefined])(
    "does not lock the popup auth state when wasLocked is %s",
    async (wasLocked) => {
      (saveSettingsService as jest.Mock).mockResolvedValue(
        makeSettingsResponse(wasLocked),
      );
      const store = makeStore();

      await store.dispatch(saveSettings(request) as any);

      expect(store.getState().auth.hasPrivateKey).toBe(true);
    },
  );
});
