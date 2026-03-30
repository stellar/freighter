import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import type { Variant } from "@amplitude/experiment-js-client";

import { getExperimentClient } from "helpers/experimentClient";
import { BUILD_TYPE } from "constants/env";
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

/**
 * Boolean flags — variant value is checked against ON_VARIANT_VALUES.
 * Empty for now; add flag names here as new boolean flags are introduced.
 */
const BOOLEAN_FLAGS = [] as const;

/**
 * Version flags — variant value is parsed from underscore format (1_2_3 → 1.2.3).
 * Matches the mobile implementation for interoperability.
 * Empty for now; add flag names here as new version flags are introduced.
 */
const VERSION_FLAGS = [] as const;

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

type VersionFeatureFlags = {
  [K in (typeof VERSION_FLAGS)[number]]: string;
};

/**
 * Parses a version string from underscore format to dot format.
 * e.g. "1_2_3" → "1.2.3"
 */
function parseVersionValue(value: string): string {
  return value.replace(/_/g, ".");
}

type ComplexFeatureFlags = {
  [K in (typeof COMPLEX_FLAGS)[number]]: {
    enabled: boolean;
    payload: unknown | undefined;
  };
};

type FeatureFlags = BooleanFeatureFlags &
  VersionFeatureFlags &
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

    // Pass user_properties explicitly so flags are fetched correctly even when
    // the user has opted out of analytics (mirrors mobile implementation).
    await client.fetch({
      user_properties: {
        "Bundle Id": `extension.${BUILD_TYPE}`,
      },
    });

    const variants = client.all();
    const updates: Partial<FeatureFlags> = {};

    Object.entries(variants).forEach(([key, variant]: [string, Variant]) => {
      if (variant?.value === undefined) return;

      // Boolean flags — value checked against ON_VARIANT_VALUES
      if ((BOOLEAN_FLAGS as readonly string[]).includes(key)) {
        (updates as Record<string, unknown>)[key] = ON_VARIANT_VALUES.includes(
          variant.value,
        );
      }
      // Version flags — value parsed from underscore to dot format (1_2_3 → 1.2.3)
      else if ((VERSION_FLAGS as readonly string[]).includes(key)) {
        (updates as Record<string, unknown>)[key] = parseVersionValue(
          variant.value,
        );
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
    try {
      const content = parseBannerPayload(flag.payload);
      return { enabled: !!content, content };
    } catch {
      return { enabled: false as const, content: null };
    }
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
    try {
      const content = parseScreenPayload(flag.payload);
      return { enabled: !!content, content };
    } catch {
      return { enabled: false as const, content: null };
    }
  },
);

/**
 * Returns true once the Experiment flags have been fetched (or failed).
 */
export const isRemoteConfigInitializedSelector = createSelector(
  remoteConfigSelector,
  (rc) => rc.isInitialized,
);
