import * as amplitude from "@amplitude/analytics-browser";
import { Action, Middleware } from "redux";
import { PayloadAction } from "@reduxjs/toolkit";
import { Location } from "react-router-dom";

import browser from "webextension-polyfill";

import { store } from "popup/App";
import {
  METRICS_DATA,
  DEBUG_ANALYTICS_EVENTS,
  METRICS_USER_ID,
} from "constants/localStorageTypes";
import {
  AMPLITUDE_KEY,
  METRICS_PLATFORM,
  APP_VERSION,
  BUILD_TYPE,
} from "constants/env";
import { isDev } from "@shared/helpers/dev";
import {
  settingsDataSharingSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { truncatedPublicKey } from "helpers/stellar";
import { Account, AccountType } from "@shared/api/types";
import { METRIC_NAMES } from "popup/constants/metricsNames";

type MetricsPayloadAction = PayloadAction<{
  errorMessage?: string;
  location?: Location;
}>;
type MetricHandler<AppState> = (
  state: AppState,
  action: MetricsPayloadAction,
) => void;
const handlersLookup: Record<string, MetricHandler<any>[]> = {};

/*
 * metricsMiddleware is a redux middleware that calls handlers specified to
 * respond to a specific action type. For each action dispatched, it gets a list
 * of registered handlers and passes the current state and action. These are
 * intended for metrics emission, nothing else.
 */
export function metricsMiddleware<State>(): Middleware<Action, State> {
  return ({ getState }) =>
    (next) =>
    (action: unknown) => {
      const state = getState();
      const _action = action as PayloadAction<{ errorMessage: string }>; // Redux Middleware type forces this unknown for some reason
      (handlersLookup[_action.type] || []).forEach((handler) =>
        handler(state, _action),
      );
      return next(action);
    };
}

/**
 * registerHandler registers a new function to be called any time the specified
 * action has been dispatched. This should be used to emit metrics.
 * @param {ActionType} actionType The action type. This can be a thunk action
 * type or a string.
 * @param {function} handler A callback to run when the actionType has been
 * dispatched.
 * @returns {void}
 */
export function registerHandler<State>(
  actionType: string | { type: string },
  handler: (state: State, action: MetricsPayloadAction) => void,
) {
  const type = typeof actionType === "string" ? actionType : actionType.type;
  (handlersLookup[type] ??= []).push(handler);
}

export interface MetricsData {
  accountType: AccountType;
  hwExists: boolean;
  importedExists: boolean;
  hwFunded: boolean;
  importedFunded: boolean;
  freighterFunded: boolean;
  unfundedFreighterAccounts: string[];
}

// ---------------------------------------------------------------------------
// Amplitude SDK initialization
// ---------------------------------------------------------------------------

let hasInitialized = false;

/**
 * Cap for the debug ring buffer persisted to localStorage.
 * 50 entries is enough to see a full user flow while keeping
 * storage usage negligible.
 */
const MAX_RECENT_EVENTS = 50;

/**
 * Events older than this (in ms) are automatically flushed.
 * 10 minutes keeps the buffer relevant without accumulating stale data.
 */
const DEBUG_EVENT_TTL_MS = 10 * 60 * 1000;

export interface DebugEvent {
  event: string;
  timestamp: number;
  props?: Record<string, unknown>;
}

/**
 * Reads persisted debug events from localStorage, filtering out any
 * entries older than DEBUG_EVENT_TTL_MS.
 * @returns {DebugEvent[]} Events that are still within the TTL window.
 */
const readPersistedEvents = (): DebugEvent[] => {
  try {
    const raw = localStorage.getItem(DEBUG_ANALYTICS_EVENTS);
    if (!raw) return [];
    const events: DebugEvent[] = JSON.parse(raw);
    const cutoff = Date.now() - DEBUG_EVENT_TTL_MS;
    return events.filter((e) => e.timestamp >= cutoff);
  } catch {
    return [];
  }
};

// Initialize the snapshot from localStorage so the debug panel shows
// persisted events immediately after a page refresh (dev only).
let recentEventsSnapshot: DebugEvent[] = isDev ? readPersistedEvents() : [];
let debugListeners: Array<() => void> = [];

/**
 * Writes the given events array to localStorage, capped at
 * MAX_RECENT_EVENTS. Only writes in dev builds — production builds
 * never persist debug analytics data. Silently ignores storage errors.
 */
const writePersistedEvents = (events: DebugEvent[]): void => {
  if (!isDev) return; // defense-in-depth: never write analytics debug data in production
  try {
    localStorage.setItem(
      DEBUG_ANALYTICS_EVENTS,
      JSON.stringify(events.slice(0, MAX_RECENT_EVENTS)),
    );
  } catch {
    // localStorage full or unavailable — degrade gracefully
  }
};

/**
 * Updates the cached snapshot and notifies subscribers.
 * `useSyncExternalStore` compares snapshots by reference — we must only
 * produce a new array when the buffer actually changes.
 *
 * @param precomputed If provided, used directly instead of re-reading
 * localStorage. Callers that already have the up-to-date array (e.g.
 * `addToRecentEvents`) pass it here to avoid a redundant read.
 */
const invalidateSnapshot = (precomputed?: DebugEvent[]) => {
  recentEventsSnapshot = precomputed ?? readPersistedEvents();
  debugListeners.forEach((listener) => listener());
};

/**
 * Adds an event to the debug ring buffer persisted in localStorage.
 * Only active in dev builds — production builds skip entirely.
 * Events are shared across all extension tabs via localStorage.
 */
const addToRecentEvents = (
  event: string,
  props?: Record<string, unknown>,
): void => {
  if (!isDev) return;

  const entry: DebugEvent = { event, timestamp: Date.now(), props };
  const events = readPersistedEvents();
  const updated = [entry, ...events].slice(0, MAX_RECENT_EVENTS);
  writePersistedEvents(updated);
  invalidateSnapshot(updated);
};

/**
 * Returns a stable snapshot of the recent events debug buffer.
 * The reference only changes when events are added or cleared.
 * Compatible with React's `useSyncExternalStore`.
 * @returns {DebugEvent[]} Cached shallow copy of the recent events buffer.
 */
export const getRecentEvents = (): DebugEvent[] => recentEventsSnapshot;

/**
 * Clears the recent events debug buffer and notifies all subscribers.
 */
export const clearRecentEvents = (): void => {
  writePersistedEvents([]);
  invalidateSnapshot();
};

export interface AnalyticsDebugInfo {
  hasInitialized: boolean;
  hasAmplitudeKey: boolean;
  userId: string | null | undefined;
  isSendingToAmplitude: boolean;
}

/**
 * Returns analytics debug info: SDK init state, API key presence, user ID,
 * and whether events are reaching Amplitude.
 * Compatible with React's `useSyncExternalStore` via `subscribeToDebugInfo`.
 */
export const getAnalyticsDebugInfo = (): AnalyticsDebugInfo => ({
  hasInitialized,
  hasAmplitudeKey: Boolean(AMPLITUDE_KEY),
  userId: amplitude.getUserId(),
  isSendingToAmplitude:
    hasInitialized &&
    Boolean(AMPLITUDE_KEY) &&
    settingsDataSharingSelector(store.getState()),
});

let debugInfoSnapshot: AnalyticsDebugInfo = {
  hasInitialized: false,
  hasAmplitudeKey: Boolean(AMPLITUDE_KEY),
  userId: null,
  isSendingToAmplitude: false,
};
let debugInfoListeners: Array<() => void> = [];

/**
 * Returns a stable snapshot of debug info for `useSyncExternalStore`.
 * The reference only changes when the underlying values change.
 */
export const getDebugInfoSnapshot = (): AnalyticsDebugInfo => debugInfoSnapshot;

const refreshDebugInfoSnapshot = () => {
  const next = getAnalyticsDebugInfo();
  // Only produce a new reference when relevant values have changed.
  if (
    next.hasInitialized !== debugInfoSnapshot.hasInitialized ||
    next.hasAmplitudeKey !== debugInfoSnapshot.hasAmplitudeKey ||
    next.userId !== debugInfoSnapshot.userId ||
    next.isSendingToAmplitude !== debugInfoSnapshot.isSendingToAmplitude
  ) {
    debugInfoSnapshot = next;
    debugInfoListeners.forEach((l) => l());
  }
};

/**
 * Subscribes to analytics debug info changes. Listens to Redux store
 * updates (data-sharing toggle) so the debug panel stays reactive.
 * Compatible with React's `useSyncExternalStore`.
 */
let unsubscribeFromStore: (() => void) | null = null;

export const subscribeToDebugInfo = (listener: () => void): (() => void) => {
  // Lazily subscribe to the Redux store on first listener.
  if (debugInfoListeners.length === 0) {
    unsubscribeFromStore = store.subscribe(refreshDebugInfoSnapshot);
  }
  debugInfoListeners.push(listener);
  // Refresh immediately so the first subscriber gets current data.
  refreshDebugInfoSnapshot();
  return () => {
    debugInfoListeners = debugInfoListeners.filter((l) => l !== listener);
    // Clean up the Redux subscription when no listeners remain.
    if (debugInfoListeners.length === 0 && unsubscribeFromStore) {
      unsubscribeFromStore();
      unsubscribeFromStore = null;
    }
  };
};

/**
 * Subscribes to debug event buffer changes (add/clear). Returns an
 * unsubscribe function. Compatible with React's `useSyncExternalStore`.
 * @param listener Callback invoked whenever the buffer changes.
 * @returns Unsubscribe function.
 */
export const subscribeToDebugEvents = (listener: () => void): (() => void) => {
  debugListeners.push(listener);
  return () => {
    debugListeners = debugListeners.filter((l) => l !== listener);
  };
};

// Listen for cross-tab localStorage changes so the debug panel live-updates
// when another extension popup tab fires events.
if (isDev && typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === DEBUG_ANALYTICS_EVENTS) {
      invalidateSnapshot();
    }
  });
}

// ---------------------------------------------------------------------------
// User identity (mirrors mobile's src/services/analytics/user.ts)
// ---------------------------------------------------------------------------

/** Mirrors mobile's `generateRandomUserId` — a numeric decimal string. */
const generateRandomUserId = (): string =>
  Math.random().toString().split(".")[1];

/** Session-level cache, mirrors mobile's module-level `sessionUserId` fallback. */
let sessionUserId: string | null = null;

/**
 * Gets or creates a persistent analytics user ID.
 * Mirrors mobile's `getUserId` from `src/services/analytics/user.ts`:
 * - Reads from localStorage under key `"metrics_user_id"`
 * - Falls back to a session-only ID if storage is unavailable
 */
const getUserId = (): string => {
  try {
    const stored = localStorage.getItem(METRICS_USER_ID);
    if (stored) {
      sessionUserId = stored;
      return stored;
    }

    const newId = generateRandomUserId();
    try {
      localStorage.setItem(METRICS_USER_ID, newId);
    } catch {
      // Storage write failed — hold in session only
    }
    sessionUserId = newId;
    return newId;
  } catch {
    if (sessionUserId) return sessionUserId;
    sessionUserId = generateRandomUserId();
    return sessionUserId;
  }
};

/**
 * Initializes the Amplitude SDK. Should be called once at app startup.
 * In development (no AMPLITUDE_KEY), events are logged to console only.
 */
export const initAmplitude = () => {
  if (hasInitialized) return;

  if (!AMPLITUDE_KEY) {
    if (!isDev) {
      console.error(
        "[Amplitude] Missing AMPLITUDE_KEY — events will not be uploaded",
      );
    }
    hasInitialized = true;
    return;
  }

  try {
    amplitude.init(AMPLITUDE_KEY, undefined, {
      // Use localStorage for identity persistence. The SDK will automatically
      // generate a UUID deviceId and persist it across sessions.
      identityStorage: "localStorage",
      autocapture: false,
      // The extension popup can close at any time; reduce the flush interval
      // so queued events are sent promptly instead of waiting the default 1 s.
      flushIntervalMillis: 500,
    });

    // Set a persistent user ID for parity with mobile.
    const userId = getUserId();
    amplitude.setUserId(userId);

    // Set persistent user properties (mirrors mobile's setAmplitudeUserProperties)
    const identify = new amplitude.Identify();
    identify.set("Bundle Id", `extension.${BUILD_TYPE}`);
    amplitude.identify(identify);

    // Apply initial opt-out state. Note: settings may not yet be loaded from the
    // background at this point (they're fetched async). The store subscription
    // below will correct this as soon as the real preference arrives.
    const isDataSharingAllowed = settingsDataSharingSelector(store.getState());
    amplitude.setOptOut(!isDataSharingAllowed);

    hasInitialized = true;

    // Keep opt-out in sync whenever the data-sharing setting changes in Redux.
    // This is the authoritative source of truth; the initial call above may fire
    // before settings are loaded from the background script.
    let lastDataSharingAllowed: boolean | null = null;
    store.subscribe(() => {
      const allowed = settingsDataSharingSelector(store.getState());
      if (allowed !== lastDataSharingAllowed) {
        lastDataSharingAllowed = allowed;
        amplitude.setOptOut(!allowed);
      }
    });

    // Flush any queued events before the popup window closes so they aren't lost.
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        amplitude.flush();
      });
    }
  } catch (e) {
    console.error("[Amplitude] Failed to initialize", e);
  }
};

// ---------------------------------------------------------------------------
// Common context (mirrors mobile's buildCommonContext)
// ---------------------------------------------------------------------------

/**
 * Returns the extension version. Prefers the build-time constant (always
 * available via DefinePlugin), falling back to the browser extension manifest.
 */
const getAppVersion = (): string => {
  if (APP_VERSION) return APP_VERSION;

  try {
    return browser.runtime.getManifest().version;
  } catch {
    return "unknown";
  }
};

/**
 * Extracts a coarsened browser identifier from the user agent string.
 * Returns "BrowserName/MajorVersion" (e.g. "Chrome/120", "Firefox/121").
 * Falls back to "Unknown" if parsing fails.
 */
const getCoarsenedUserAgent = (): string => {
  const ua = navigator.userAgent;

  // Order matters: check more specific browsers first.
  // Edge includes "Chrome" in its UA, so check Edge before Chrome.
  const patterns: Array<[RegExp, string]> = [
    [/Edg(?:e|A|iOS)?\/(\d+)/, "Edge"],
    [/OPR\/(\d+)/, "Opera"],
    [/Firefox\/(\d+)/, "Firefox"],
    [/(?:Chrome|CriOS)\/(\d+)/, "Chrome"],
    [/Version\/(\d+).*Safari/, "Safari"],
  ];

  for (const [regex, name] of patterns) {
    const match = ua.match(regex);
    if (match) {
      return `${name}/${match[1]}`;
    }
  }

  return "Unknown";
};

/**
 * Builds common context data attached to every event.
 * Mirrors the mobile app's context properties for consistency across platforms.
 *
 * | Mobile property   | Extension equivalent                         |
 * |-------------------|----------------------------------------------|
 * | Platform.OS       | METRICS_PLATFORM ("WEB")                     |
 * | Platform.Version  | coarsened user agent (e.g. "Chrome/120")     |
 * | getVersion()      | manifest version / APP_VERSION               |
 * | getBundleId()     | "extension.<BUILD_TYPE>"                     |
 *
 * @param state Current Redux state (passed in to avoid a redundant getState() call).
 */
const buildCommonContext = (
  state: ReturnType<typeof store.getState>,
): Record<string, unknown> => {
  const activePublicKey = publicKeySelector(state);
  const networkDetails = settingsNetworkDetailsSelector(state);

  // Navigator.connection is not available in all browsers
  const nav = navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string };
  };

  const context: Record<string, unknown> = {
    publicKey: activePublicKey ? truncatedPublicKey(activePublicKey) : "N/A",
    platform: METRICS_PLATFORM,
    platformVersion: getCoarsenedUserAgent(),
    network: networkDetails?.network ?? "UNKNOWN",
    connectionType: nav.connection?.type ?? "unknown",
    appVersion: getAppVersion(),
    bundleId: `extension.${BUILD_TYPE}`,
  };

  if (nav.connection?.effectiveType) {
    context.effectiveType = nav.connection.effectiveType;
  }

  return context;
};

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const METRICS_DATA_DEFAULTS: MetricsData = {
  accountType: AccountType.FREIGHTER,
  hwExists: false,
  importedExists: false,
  hwFunded: false,
  importedFunded: false,
  freighterFunded: false,
  unfundedFreighterAccounts: [],
};

/**
 * Reads and parses metrics data from localStorage.
 * Returns safe defaults if the entry is missing or contains invalid JSON
 * (e.g. after a storage corruption or schema change).
 */
const getMetricsData = (): MetricsData => {
  try {
    const raw = localStorage.getItem(METRICS_DATA);
    if (!raw) return { ...METRICS_DATA_DEFAULTS };
    return JSON.parse(raw) as MetricsData;
  } catch {
    return { ...METRICS_DATA_DEFAULTS };
  }
};

// ---------------------------------------------------------------------------
// Event emission
// ---------------------------------------------------------------------------

/**
 * Emits a named analytics event to Amplitude with optional metadata.
 * Respects the user's data-sharing preference; no-ops if disabled.
 * @param name The event name for the Amplitude dashboard.
 * @param body Optional object containing event-specific metadata.
 */
export const emitMetric = (name: string, body?: Record<string, unknown>) => {
  const state = store.getState();

  const metricsData = getMetricsData();

  const eventProperties = {
    ...buildCommonContext(state),
    ...body,
    freighter_account_funded: metricsData.freighterFunded,
    hw_connected: metricsData.hwExists,
    secret_key_account: metricsData.importedExists,
    secret_key_account_funded: metricsData.importedFunded,
  };

  // Record to debug buffer before the data-sharing check so that dev
  // builds always capture events regardless of the sharing preference.
  addToRecentEvents(name, eventProperties);

  const isDataSharingAllowed = settingsDataSharingSelector(state);
  if (!isDataSharingAllowed) {
    return;
  }

  if (!AMPLITUDE_KEY || !hasInitialized) {
    console.log("Amplitude event (not uploaded):", name, eventProperties);
    return;
  }

  amplitude.track(name, eventProperties);
};

/**
 * Persists balance-related metrics data for a given account.
 * Tracks whether HW, imported, or Freighter accounts are funded, and
 * emits a one-time event when a previously unfunded Freighter account
 * receives its first funding.
 * @param publicKey The Stellar public key (G-address) of the account.
 * @param accountFunded Whether the account currently has a balance.
 */
export const storeBalanceMetricData = (
  publicKey: string,
  accountFunded: boolean,
) => {
  const metricsData: MetricsData = getMetricsData();
  const accountType = metricsData.accountType;

  if (accountFunded && accountType === AccountType.HW) {
    metricsData.hwFunded = true;
  }
  if (accountFunded && accountType === AccountType.IMPORTED) {
    metricsData.importedFunded = true;
  }
  if (accountType === AccountType.FREIGHTER) {
    // Track previously-unfunded Freighter accounts so we can fire a one-time
    // "funded" event. Keys are truncated before storage to avoid persisting
    // full G-addresses to localStorage.
    const unfundedFreighterAccounts =
      metricsData.unfundedFreighterAccounts || [];
    const truncated = truncatedPublicKey(publicKey);
    const idx = unfundedFreighterAccounts.indexOf(truncated);

    if (accountFunded) {
      metricsData.freighterFunded = true;
      if (idx !== -1) {
        emitMetric(METRIC_NAMES.freighterAccountFunded, {
          publicKey: truncated,
        });
        unfundedFreighterAccounts.splice(idx, 1);
      }
    }
    if (!accountFunded && idx === -1) {
      unfundedFreighterAccounts.push(truncated);
    }
    metricsData.unfundedFreighterAccounts = unfundedFreighterAccounts;
  }

  localStorage.setItem(METRICS_DATA, JSON.stringify(metricsData));
};

/**
 * Persists account-type metrics data derived from the user's full account list.
 * Records whether HW or imported accounts exist, and sets the active account
 * type for subsequent metric emissions.
 * @param publicKey The currently active Stellar public key.
 * @param allAccounts All accounts known to the wallet.
 */
export const storeAccountMetricsData = (
  publicKey: string,
  allAccounts: Account[],
) => {
  const metricsData: MetricsData = getMetricsData();

  let accountType = AccountType.FREIGHTER;
  allAccounts.forEach((acc: Account) => {
    if (acc.hardwareWalletType) {
      metricsData.hwExists = true;
    } else if (acc.imported) {
      metricsData.importedExists = true;
    }

    if (acc.publicKey === publicKey) {
      if (acc.hardwareWalletType) {
        accountType = AccountType.HW;
      } else if (acc.imported) {
        accountType = AccountType.IMPORTED;
      } else {
        accountType = AccountType.FREIGHTER;
      }
    }
  });
  metricsData.accountType = accountType;
  localStorage.setItem(METRICS_DATA, JSON.stringify(metricsData));
};
