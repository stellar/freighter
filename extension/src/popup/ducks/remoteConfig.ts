import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";

import { getExperimentClient } from "helpers/experimentClient";
import {
  parseBannerPayload,
  parseScreenPayload,
} from "popup/helpers/maintenance/parseMaintenanceContent";
import {
  MaintenanceBannerContent,
  MaintenanceScreenContent,
} from "popup/helpers/maintenance/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAINTENANCE_BANNER_FLAG = "maintenance_banner";
const MAINTENANCE_SCREEN_FLAG = "maintenance_screen";

/**
 * Variant values that indicate a flag is switched "on".
 * Matching the mobile implementation for interoperability.
 */
const ON_VARIANT_VALUES = ["on", "true", "enabled", "yes"];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface MaintenanceFlagState<TContent> {
  enabled: boolean;
  content: TContent | null;
}

interface RemoteConfigState {
  isInitialized: boolean;
  maintenanceBanner: MaintenanceFlagState<MaintenanceBannerContent>;
  maintenanceScreen: MaintenanceFlagState<MaintenanceScreenContent>;
}

const initialState: RemoteConfigState = {
  isInitialized: false,
  maintenanceBanner: { enabled: false, content: null },
  maintenanceScreen: { enabled: false, content: null },
};

// ---------------------------------------------------------------------------
// Thunk
// ---------------------------------------------------------------------------

/**
 * Fetches all Amplitude Experiment flags and parses the maintenance flags.
 *
 * Called once per popup open from `useRemoteConfig`. When the Experiment
 * client is unavailable (e.g. no deployment key in dev), returns the initial
 * state so all flags default to disabled.
 */
export const fetchFeatureFlags = createAsyncThunk(
  "remoteConfig/fetchFeatureFlags",
  async (): Promise<RemoteConfigState> => {
    const client = getExperimentClient();

    if (!client) {
      return { ...initialState, isInitialized: true };
    }

    await client.fetch();

    const variants = client.all();

    // --- maintenance_banner ---
    const bannerVariant = variants[MAINTENANCE_BANNER_FLAG];
    const bannerEnabled =
      bannerVariant?.value !== undefined &&
      ON_VARIANT_VALUES.includes(bannerVariant.value);
    const bannerContent = bannerEnabled
      ? parseBannerPayload(bannerVariant?.payload)
      : null;

    // --- maintenance_screen ---
    const screenVariant = variants[MAINTENANCE_SCREEN_FLAG];
    const screenEnabled =
      screenVariant?.value !== undefined &&
      ON_VARIANT_VALUES.includes(screenVariant.value);
    const screenContent = screenEnabled
      ? parseScreenPayload(screenVariant?.payload)
      : null;

    return {
      isInitialized: true,
      maintenanceBanner: {
        enabled: bannerEnabled && !!bannerContent,
        content: bannerContent,
      },
      maintenanceScreen: {
        enabled: screenEnabled && !!screenContent,
        content: screenContent,
      },
    };
  },
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const remoteConfigSlice = createSlice({
  name: "remoteConfig",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatureFlags.fulfilled, (_state, action) => {
        return action.payload;
      })
      .addCase(fetchFeatureFlags.rejected, (state) => {
        // Mark as initialized with safe defaults so we don't retry and block
        // the user if the network or SDK call fails.
        state.isInitialized = true;
      });
  },
});

export const { reducer } = remoteConfigSlice;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const remoteConfigSelector = (state: { remoteConfig: RemoteConfigState }) =>
  state.remoteConfig;

/**
 * Returns the maintenance banner flag state (enabled + resolved content).
 */
export const maintenanceBannerSelector = createSelector(
  remoteConfigSelector,
  (rc) => rc.maintenanceBanner,
);

/**
 * Returns the maintenance screen flag state (enabled + resolved content).
 */
export const maintenanceScreenSelector = createSelector(
  remoteConfigSelector,
  (rc) => rc.maintenanceScreen,
);

/**
 * Returns true once the Experiment flags have been fetched (or failed).
 */
export const isRemoteConfigInitializedSelector = createSelector(
  remoteConfigSelector,
  (rc) => rc.isInitialized,
);
