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

// ---------------------------------------------------------------------------
// Feature flag configuration
// ---------------------------------------------------------------------------

/**
 * Variant values that indicate a flag is switched "on".
 * Matching the mobile implementation for interoperability.
 */
const ON_VARIANT_VALUES = ["on", "true", "enabled", "yes"];

/** Boolean flags — variant value is checked against ON_VARIANT_VALUES. */
const BOOLEAN_FLAGS = [] as const;

/** String flags — variant value is used directly. */
const STRING_FLAGS = [] as const;

/**
 * Complex flags — enabled via ON_VARIANT_VALUES, raw payload is forwarded.
 * Specific flags (e.g. maintenance_banner) get parsed in their selectors.
 */
const COMPLEX_FLAGS = ["maintenance_banner", "maintenance_screen"] as const;

// ---------------------------------------------------------------------------
// Derived types (mirrors freighter-mobile/src/ducks/remoteConfig.ts)
// ---------------------------------------------------------------------------

type BooleanFeatureFlags = {
  [K in (typeof BOOLEAN_FLAGS)[number]]: boolean;
};

type StringFeatureFlags = {
  [K in (typeof STRING_FLAGS)[number]]: string;
};

type ComplexFeatureFlags = {
  [K in (typeof COMPLEX_FLAGS)[number]]: {
    enabled: boolean;
    payload: Record<string, unknown> | undefined;
  };
};

type FeatureFlags = BooleanFeatureFlags &
  StringFeatureFlags &
  ComplexFeatureFlags;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface RemoteConfigState extends FeatureFlags {
  isInitialized: boolean;
}

const initialState: RemoteConfigState = {
  isInitialized: false,
  maintenance_banner: { enabled: false, payload: undefined },
  maintenance_screen: { enabled: false, payload: undefined },
};

// ---------------------------------------------------------------------------
// Thunk
// ---------------------------------------------------------------------------

/**
 * Fetches all Amplitude Experiment flags and categorises them into boolean,
 * string, and complex buckets — mirroring the mobile implementation.
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
    const updates: Partial<FeatureFlags> = {};

    Object.entries(variants).forEach(([key, variant]) => {
      if (variant?.value === undefined) return;

      // Boolean flags — value checked against ON_VARIANT_VALUES
      if ((BOOLEAN_FLAGS as readonly string[]).includes(key)) {
        (updates as Record<string, unknown>)[key] = ON_VARIANT_VALUES.includes(
          variant.value,
        );
      }
      // String flags — value used directly
      else if ((STRING_FLAGS as readonly string[]).includes(key)) {
        (updates as Record<string, unknown>)[key] = variant.value;
      }
      // Complex flags — enabled + raw payload
      else if ((COMPLEX_FLAGS as readonly string[]).includes(key)) {
        const enabled = ON_VARIANT_VALUES.includes(variant.value);
        (updates as Record<string, unknown>)[key] = {
          enabled,
          payload: enabled ? variant.payload : undefined,
        };
      }
    });

    return { ...initialState, ...updates, isInitialized: true };
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
 * Payload parsing happens here so the Redux store stays generic.
 */
export const maintenanceBannerSelector = createSelector(
  remoteConfigSelector,
  (rc) => {
    const flag = rc.maintenance_banner;
    if (!flag.enabled) {
      return { enabled: false as const, content: null };
    }
    const content = parseBannerPayload(flag.payload);
    return { enabled: !!content, content };
  },
);

/**
 * Returns the maintenance screen flag state (enabled + resolved content).
 * Payload parsing happens here so the Redux store stays generic.
 */
export const maintenanceScreenSelector = createSelector(
  remoteConfigSelector,
  (rc) => {
    const flag = rc.maintenance_screen;
    if (!flag.enabled) {
      return { enabled: false as const, content: null };
    }
    const content = parseScreenPayload(flag.payload);
    return { enabled: !!content, content };
  },
);

/**
 * Returns true once the Experiment flags have been fetched (or failed).
 */
export const isRemoteConfigInitializedSelector = createSelector(
  remoteConfigSelector,
  (rc) => rc.isInitialized,
);
