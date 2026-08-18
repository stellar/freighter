import * as amplitude from "@amplitude/analytics-browser";
import * as Sentry from "@sentry/browser";
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
import {
  publicKeySelector,
  allAccountsSelector,
} from "popup/ducks/accountServices";
import { balancesSelector } from "popup/ducks/cache";
import { Account, AccountType } from "@shared/api/types";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getAnalyticsUserId } from "@shared/api/internal";

// Console log message constants
const LOG_MESSAGES = {
  AMPLITUDE_PREFIX: "[Amplitude]",
  MISSING_KEY: "Missing AMPLITUDE_KEY — events will not be uploaded",
  INIT_FAILED: "Failed to initialize",
  IDENTIFY_FAILED: "Failed to send Identify",
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
}> & {
  // Present at runtime on createAsyncThunk actions: `meta.arg` is the dispatched
  // thunk argument (used to read the dApp `url`→`origin`), and `.error` carries
  // a runtime rejection's message. Typed optional so metrics handlers can read
  // them without casting.
  meta?: { arg?: { url?: string; assetCode?: string } };
  error?: { message?: string };
};
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

/** Resolves an account's type from its discriminating fields. */
const resolveAccountType = (account: Account): AccountType => {
  if (account.hardwareWalletType) return AccountType.HW;
  if (account.imported) return AccountType.IMPORTED;
  return AccountType.FREIGHTER;
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
 * Once-per-unlocked-session guard for `reconcileAnalyticsUserId`.
 * `fetchData` (useGetAppData) runs on many screens and re-runs on every
 * navigation/refresh; each reconcile hits the background's
 * `getAnalyticsUserId`, which decrypts the mnemonic and runs BIP39 seed
 * derivation (see callBackendV2's per-request PBKDF2 note). We only need to
 * reconcile once per unlocked session, so short-circuit after the first
 * successful resolve and reset the flag on lock (see
 * `resetAnalyticsUserIdReconciliation`, wired into SessionLockListener) so a
 * later unlock — possibly of a different wallet — reconciles again.
 */
let hasReconciledUserId = false;

/**
 * Clears the once-per-session reconciliation guard so the next
 * `reconcileAnalyticsUserId` call re-derives the auth id. Called on every
 * lock transition (auto-lock and manual sign-out both broadcast
 * `SESSION_LOCKED`).
 */
export const resetAnalyticsUserIdReconciliation = (): void => {
  hasReconciledUserId = false;
};

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
 * Resolves the seed-derived auth user id from the background and, when it
 * differs from the persisted id, adopts it as the canonical analytics/Sentry
 * user id (overwriting the random bootstrap id — this migrates existing
 * users onto a stable, cross-platform-consistent id). Idempotent; no-op
 * when locked (background returns `null`) or already reconciled. Never
 * throws into callers.
 */
export const reconcileAnalyticsUserId = async (): Promise<void> => {
  // Already reconciled this unlocked session — skip the background round-trip
  // (mnemonic decrypt + BIP39 derivation) entirely. The guard is reset on
  // lock so the next unlocked session reconciles once more.
  if (hasReconciledUserId) return;

  // Whole body wrapped in one try/catch — a storage-quota throw from
  // setItem, or anything unexpected from amplitude/Sentry, must never
  // become an unhandled rejection for callers. Catch → return.
  try {
    const res = await getAnalyticsUserId();
    const authUserId = res.analyticsUserId;

    // No id means the wallet is locked/unavailable; leave the guard unset so
    // we retry once the session is actually unlocked.
    if (!authUserId) return;
    // A real id resolved — this session is reconciled. Mark it before the
    // already-matching early return so routine reloads short-circuit above.
    hasReconciledUserId = true;
    if (localStorage.getItem(METRICS_USER_ID) === authUserId) return;

    localStorage.setItem(METRICS_USER_ID, authUserId);
    sessionUserId = authUserId;
    // amplitude.setUserId is local-only (setOptOut governs upload), so this
    // runs regardless of the data-sharing consent setting.
    if (hasInitialized && AMPLITUDE_KEY) {
      amplitude.setUserId(authUserId);
    }

    // Consent-gate the Sentry write: when data-sharing is off, ErrorTracking
    // owns the opted-out identity (setUser(null) + close()) — don't
    // re-identify the user behind its back.
    const isDataSharingAllowed = settingsDataSharingSelector(store.getState());
    if (isDataSharingAllowed) {
      Sentry.setUser({ id: authUserId });
    }
  } catch {
    return; // never throw into callers
  }
};

/**
 * Initializes the Amplitude SDK. Should be called once at app startup.
 * In development (no AMPLITUDE_KEY), events are logged to console only.
 */
export const initAmplitude = async () => {
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

    hasInitialized = true;

    // Initialize Experiment client now that analytics is ready.
    // initializeWithAmplitudeAnalytics requires the analytics SDK to be started first.
    initExperimentClient();

    // Resolve the surface once (async) so getSurface() is synchronous afterward.
    await resolveSurface();

    // The persisted data-sharing preference has NOT hydrated yet at init — it
    // defaults to `false` and the real value arrives asynchronously. Emitting
    // app.opened here would be suppressed (emitMetric's consent gate) or dropped
    // by the SDK (opt-out), yet lost forever. So defer it: emit exactly once, the
    // moment data-sharing is (or becomes) allowed.
    let hasEmittedAppOpened = false;
    const emitAppOpenedOnce = () => {
      if (hasEmittedAppOpened) return;
      hasEmittedAppOpened = true;

      const nav = navigator as Navigator & {
        connection?: { type?: string; effectiveType?: string };
      };
      emitMetric(METRIC_NAMES.appOpened, {
        connection_type: nav.connection?.type ?? "unknown",
        ...(nav.connection?.effectiveType
          ? { effective_type: nav.connection.effectiveType }
          : {}),
      });
    };

    // Keep Amplitude opt-out synced with the data-sharing preference (the
    // authoritative source of truth). Primes immediately for the case where
    // settings are already hydrated, and updates on every change. Fires the
    // one-shot app.opened the first time consent resolves to allowed.
    let lastDataSharingAllowed: boolean | null = null;
    const syncDataSharing = () => {
      const allowed = settingsDataSharingSelector(store.getState());
      if (allowed !== lastDataSharingAllowed) {
        lastDataSharingAllowed = allowed;
        amplitude.setOptOut(!allowed);
        if (allowed) emitAppOpenedOnce();
      }
    };
    store.subscribe(syncDataSharing);
    syncDataSharing();

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

/** Derives the durable Identify traits from the full account list. */
export const deriveIdentifyTraits = (allAccounts: Account[]) => {
  let hasHardware = false;
  let hasImported = false;
  allAccounts.forEach((acc) => {
    if (acc.hardwareWalletType) {
      hasHardware = true;
    } else if (acc.imported) {
      hasImported = true;
    }
  });
  return {
    wallet_count: allAccounts.length,
    has_hardware_wallet: hasHardware,
    has_imported_account: hasImported,
  };
};

// Only re-send Identify when a durable trait actually changed.
let lastIdentifiedTraits: string | null = null;

/** Sends durable wallet-composition traits to Amplitude Identify (dirty-checked). */
export const syncIdentifyTraits = (allAccounts: Account[]): void => {
  const traits = deriveIdentifyTraits(allAccounts);
  const fingerprint = JSON.stringify(traits);
  if (fingerprint === lastIdentifiedTraits) return;

  if (!AMPLITUDE_KEY || !hasInitialized) return;

  // Don't cache the fingerprint unless the Identify can actually be sent. During
  // startup this runs before the data-sharing preference hydrates (SDK still
  // opted out), so caching here would record traits as "sent" while the SDK
  // drops them — and the unchanged traits would then be suppressed forever. Skip
  // without caching so a later call (after consent hydrates) re-syncs.
  if (!settingsDataSharingSelector(store.getState())) return;

  // Cache the fingerprint only after the Identify has been dispatched
  // successfully. Caching before the send would mean a one-off throw leaves the
  // dirty-check short-circuiting every later sync with the same traits, so they'd
  // never retry. Mirrors the mobile implementation (freighter-mobile#936).
  try {
    const identify = new amplitude.Identify();
    identify.set("wallet_count", traits.wallet_count);
    identify.set("has_hardware_wallet", traits.has_hardware_wallet);
    identify.set("has_imported_account", traits.has_imported_account);
    amplitude.identify(identify);

    lastIdentifiedTraits = fingerprint;
  } catch (e) {
    // Leave lastIdentifiedTraits unset so the next call retries.
    console.error(
      `${LOG_MESSAGES.AMPLITUDE_PREFIX} ${LOG_MESSAGES.IDENTIFY_FAILED}`,
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

  const context: Record<string, unknown> = {
    schema_version: SCHEMA_VERSION,
    surface: getSurface(),
    network: networkDetails?.network ?? "UNKNOWN",
  };

  // Active-account fields are meaningful only when there is an active account.
  // Pre-unlock (no active key) we omit them rather than emit a default
  // "freighter/false" context that misrepresents state.
  if (activePublicKey) {
    const idHash = getAccountIdHash(activePublicKey);
    if (idHash) context.account_id_hash = idHash;

    // Resolve account_type/is_hardware_account LIVE from the Redux account
    // list, keyed on the active public key — not from the localStorage
    // metricsData cache. Account-mutation thunks (importAccount,
    // importHardwareWallet, addAccount, createAccount) switch the active
    // account without refreshing metricsData, so the cache can lag a switch
    // and mislabel e.g. a freshly-imported secret-key account as "freighter"
    // until the next full app-data reload. If the active key isn't resolvable
    // in allAccounts (an auth-store update race), OMIT these fields rather
    // than guessing — matching mobile's fail-safe behavior.
    const activeAccount = (allAccountsSelector(state) ?? []).find(
      (acc: Account) => acc.publicKey === activePublicKey,
    );
    if (activeAccount) {
      const accountType = resolveAccountType(activeAccount);
      context.account_type = ACCOUNT_TYPE_WIRE[accountType];
      context.is_hardware_account = accountType === AccountType.HW;
    }

    // account_funded reflects the *active account's* cached balance, not a
    // sticky per-account-type flag — funding one Freighter account must not
    // make every other (unfunded) Freighter account report funded. Balances
    // are cached per network, per public key (see popup/ducks/cache
    // balanceData); omit the property entirely (rather than defaulting to
    // false) when there is no cached entry, or the cached fundedness is
    // unknown (`isFunded === null`), for the active key.
    const cachedBalances =
      balancesSelector(state)[networkDetails?.network ?? ""]?.[activePublicKey];
    if (cachedBalances && cachedBalances.isFunded !== null) {
      context.account_funded = cachedBalances.isFunded;
    }
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

// ---------------------------------------------------------------------------
// Screen views (screen.viewed consolidation)
// ---------------------------------------------------------------------------

/**
 * The product areas a screen can belong to. Attached to `screen.viewed` as the
 * `flow` property so screens can be grouped cross-platform. `undefined` when no
 * flow is a good fit (e.g. the home account view, debug/integration screens).
 */
export type Flow =
  | "onboarding"
  | "send"
  | "swap"
  | "signing"
  | "assets"
  | "settings"
  | "discovery"
  | "security"
  | "history";

/**
 * Canonical cross-platform `step` vocabulary (RFC #2883): a screen's position
 * within a multi-step flow. Closed set, applied identically on mobile — a
 * screen present on both platforms MUST carry the same `step`.
 *   - `confirm`:    the review/confirm stage before submitting (send/swap).
 *   - `processing`: the in-flight submission stage.
 *   - `success`:    the terminal completion stage of a flow.
 */
export type Step = "confirm" | "processing" | "success";

/** Extra, screen-specific properties carried alongside the canonical event. */
export interface ScreenViewedProps {
  /** Product-area grouping; omitted from the event when undefined. */
  flow?: Flow;
  /** Stage within a flow (see Step); omitted when undefined. */
  step?: Step;
  [key: string]: unknown;
}

/**
 * Emits the single canonical screen-view event, `screen.viewed`, carrying a
 * `screen_name` plus optional `flow`, `step`, and any preserved extra props.
 * `surface` and the rest of the common context are attached by emitMetric.
 * Properties whose value is `undefined` are dropped so the wire payload stays
 * clean (e.g. no `flow: undefined`).
 */
export const emitScreenViewed = (
  screenName: string,
  props: ScreenViewedProps = {},
) => {
  const body: Record<string, unknown> = { screen_name: screenName };
  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined) {
      body[key] = value;
    }
  });
  emitMetric(METRIC_NAMES.screenViewed, body);
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
        emitMetric(METRIC_NAMES.accountFirstFunded, {
          account_id_hash: getAccountIdHash(publicKey),
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

  syncIdentifyTraits(allAccounts);
};
