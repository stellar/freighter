import * as amplitude from "@amplitude/analytics-browser";
import { Action, Middleware } from "redux";
import { PayloadAction } from "@reduxjs/toolkit";
import { Location } from "react-router-dom";
import { hash } from "stellar-sdk";

import browser from "webextension-polyfill";

import { store } from "popup/App";
import { METRICS_DATA, METRICS_USER_ID } from "constants/localStorageTypes";
import { AMPLITUDE_KEY, APP_VERSION } from "constants/env";
import { initExperimentClient } from "helpers/experimentClient";
import { BUNDLE_ID_USER_PROPERTY_KEY, getBundleId } from "helpers/analytics";
import { isDev } from "@shared/helpers/dev";
import { truncatedPublicKey } from "helpers/stellar";
import { isSidebarMode } from "popup/helpers/isSidebarMode";
import {
  settingsDataSharingSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { Account, AccountType } from "@shared/api/types";
import { METRIC_NAMES } from "popup/constants/metricsNames";

// Console log message constants
const LOG_MESSAGES = {
  AMPLITUDE_PREFIX: "[Amplitude]",
  MISSING_KEY: "Missing AMPLITUDE_KEY — events will not be uploaded",
  INIT_FAILED: "Failed to initialize",
  EVENT_NOT_UPLOADED: "Amplitude event (not uploaded):",
} as const;

const isRuntimeTestEnv = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    (window as Window & { IS_PLAYWRIGHT?: string }).IS_PLAYWRIGHT === "true"
  );
};

type MetricsPayloadAction = PayloadAction<{
  errorMessage?: string;
  location?: Location;
}>;
type MetricHandler<AppState> = (
  state: AppState,
  action: MetricsPayloadAction,
) => void;
// `any` is intentional: handlers register with specific AppState generics
// (e.g. MetricHandler<PopupState>) but are stored heterogeneously. Using
// `unknown` would break assignment due to function parameter contravariance.
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

let hasInitialized = false;

/**
 * Amplitude flush interval in milliseconds. Reduced from the default 1 second
 * so queued events are sent promptly before the extension popup closes.
 */
const AMPLITUDE_FLUSH_INTERVAL_MS = 500;

/** Schema generation marker for the new cross-platform property model. */
export const SCHEMA_VERSION = "2";

/** Maps the internal account type to the RFC's wire value for `account_type`. */
const ACCOUNT_TYPE_WIRE: Record<AccountType, string> = {
  [AccountType.FREIGHTER]: "freighter",
  [AccountType.HW]: "hardware",
  [AccountType.IMPORTED]: "imported_secret_key",
};

// ---------------------------------------------------------------------------
// User identity (mirrors mobile's src/services/analytics/user.ts)
// ---------------------------------------------------------------------------

/** Mirrors mobile's `generateRandomUserId` — a numeric decimal string. */
const generateRandomUserId = (): string =>
  // Math.random() can yield values < 1e-6 (exponential notation, e.g. "4e-7")
  // or exactly 0 ("0"), where `split(".")[1]` is undefined. Fall back to "0"
  // so we never persist or hand Sentry/Amplitude an undefined user id.
  Math.random().toString().split(".")[1] ?? "0";

/** Session-level cache, mirrors mobile's module-level `sessionUserId` fallback. */
let sessionUserId: string | null = null;

/**
 * Gets or creates a persistent analytics user ID.
 * Mirrors mobile's `getUserId` from `src/services/analytics/user.ts`:
 * - Reads from localStorage under key `"metrics_user_id"`
 * - Falls back to a session-only ID if storage is unavailable
 */
export const getUserId = (): string => {
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
    if (!isDev && !isRuntimeTestEnv()) {
      console.error(
        `${LOG_MESSAGES.AMPLITUDE_PREFIX} ${LOG_MESSAGES.MISSING_KEY}`,
      );
    }

    if (isRuntimeTestEnv()) {
      initExperimentClient();
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
      appVersion: APP_VERSION || undefined,
      // The extension popup can close at any time; reduce the flush interval
      // so queued events are sent promptly instead of waiting the default 1 s.
      flushIntervalMillis: AMPLITUDE_FLUSH_INTERVAL_MS,
    });

    // Set a persistent user ID for parity with mobile.
    const userId = getUserId();
    amplitude.setUserId(userId);

    // Set persistent user properties (mirrors mobile's setAmplitudeUserProperties)
    const identify = new amplitude.Identify();
    identify.set(BUNDLE_ID_USER_PROPERTY_KEY, getBundleId());
    amplitude.identify(identify);

    // Apply initial opt-out state. Note: settings may not yet be loaded from the
    // background at this point (they're fetched async). The store subscription
    // below will correct this as soon as the real preference arrives.
    const isDataSharingAllowed = settingsDataSharingSelector(store.getState());
    amplitude.setOptOut(!isDataSharingAllowed);

    hasInitialized = true;

    // Initialize Experiment client now that analytics is ready.
    // initializeWithAmplitudeAnalytics requires the analytics SDK to be started first.
    initExperimentClient();

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
    console.error(
      `${LOG_MESSAGES.AMPLITUDE_PREFIX} ${LOG_MESSAGES.INIT_FAILED}`,
      e,
    );
  }
};

// ---------------------------------------------------------------------------
// Common context (mirrors mobile's buildCommonContext)
// ---------------------------------------------------------------------------

export type Surface = "popup" | "sidebar" | "fullpage";

// Resolved once at init: browser.tabs.getCurrent() is async, but the emit path
// must be synchronous, so cache the surface in a module variable.
let cachedSurface: Surface | null = null;

/** Resolve and cache the surface. Call once during init, before app.opened. */
export const resolveSurface = async (): Promise<void> => {
  if (isSidebarMode()) {
    cachedSurface = "sidebar";
    return;
  }
  try {
    const tab = await browser.tabs.getCurrent();
    cachedSurface = tab ? "fullpage" : "popup";
  } catch {
    cachedSurface = "popup";
  }
};

/** Synchronous surface accessor for the emit path. */
export const getSurface = (): Surface =>
  cachedSurface ?? (isSidebarMode() ? "sidebar" : "popup");

/**
 * Cross-platform account identifier: lowercase hex SHA-256 of the full
 * G-address string. Never emit a raw/truncated public key. Memoized per key
 * so the hot emit path stays synchronous and does no repeat work. Mobile must
 * hash the same G-address string with SHA-256 to produce a matching value.
 */
const accountIdHashCache = new Map<string, string>();
export const getAccountIdHash = (publicKey: string): string => {
  const cached = accountIdHashCache.get(publicKey);
  if (cached) return cached;
  try {
    const digest = hash(Buffer.from(publicKey, "utf8")).toString("hex");
    accountIdHashCache.set(publicKey, digest);
    return digest;
  } catch {
    return "";
  }
};

/**
 * Builds the event-level "volatile context" bucket attached to every event,
 * plus schema_version. Durable traits live in Identify (see syncIdentifyTraits);
 * device/app metadata comes from the Amplitude SDK; connectivity is on app.opened.
 */
export const buildCommonContext = (
  state: ReturnType<typeof store.getState>,
): Record<string, unknown> => {
  const activePublicKey = publicKeySelector(state);
  const networkDetails = settingsNetworkDetailsSelector(state);
  const metricsData = getMetricsData();

  const accountFundedByType: Record<AccountType, boolean> = {
    [AccountType.FREIGHTER]: metricsData.freighterFunded,
    [AccountType.HW]: metricsData.hwFunded,
    [AccountType.IMPORTED]: metricsData.importedFunded,
  };

  const context: Record<string, unknown> = {
    schema_version: SCHEMA_VERSION,
    surface: getSurface(),
    network: networkDetails?.network ?? "UNKNOWN",
    account_type: ACCOUNT_TYPE_WIRE[metricsData.accountType],
    account_funded: accountFundedByType[metricsData.accountType],
    is_hardware_account: metricsData.accountType === AccountType.HW,
  };

  if (activePublicKey) {
    const idHash = getAccountIdHash(activePublicKey);
    if (idHash) context.account_id_hash = idHash;
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

  const eventProperties = {
    ...buildCommonContext(state),
    ...body,
  };

  const isDataSharingAllowed = settingsDataSharingSelector(state);
  if (!isDataSharingAllowed) {
    return;
  }

  if (!AMPLITUDE_KEY || !hasInitialized) {
    console.log(LOG_MESSAGES.EVENT_NOT_UPLOADED, name, eventProperties);
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
