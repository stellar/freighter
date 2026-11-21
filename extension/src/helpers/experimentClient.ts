import {
  Experiment,
  ExperimentClient,
  ExperimentConfig,
} from "@amplitude/experiment-js-client";

import { AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY } from "constants/env";
import { EXPERIMENT_ANONYMOUS_DEVICE_ID } from "constants/localStorageTypes";
import { isDev } from "@shared/helpers/dev";

const TEST_EXPERIMENT_DEPLOYMENT_KEY = "playwright-test-deployment-key";

// Balance and price fetches wait on the flags, so a slow Amplitude host holds
// the spinner for this long before falling back to the default flags. No
// retries: the SDK would re-send the user captured at fetch time, identity
// included, for up to a minute after the thunk has already fallen back, by
// which point data sharing may have been turned off.
const CONFIG: ExperimentConfig = {
  fetchTimeoutMillis: 1500,
  retryFetchOnFailure: false,
};

// Console log message constants
const LOG_MESSAGES = {
  EXPERIMENT_PREFIX: "[Experiment]",
  MISSING_KEY:
    "Missing AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY — feature flags will not be fetched",
  INIT_FAILED: "Failed to initialize",
} as const;

let client: ExperimentClient | null = null;

const isRuntimeTestEnv = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    (window as Window & { IS_PLAYWRIGHT?: string }).IS_PLAYWRIGHT === "true"
  );
};

/**
 * Initializes the Amplitude Experiment client with no automatic identity
 * source. `initializeWithAmplitudeAnalytics` would copy the analytics SDK's
 * user_id and device_id into every flag fetch, which bypasses the
 * data-sharing setting (setOptOut only stops event upload). The identity is
 * instead passed explicitly, consent-gated, by `fetchFeatureFlags`.
 *
 * Silently skips initialization in development when no key is configured.
 */
export const initExperimentClient = (): void => {
  const deploymentKey =
    AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY ||
    (isRuntimeTestEnv() ? TEST_EXPERIMENT_DEPLOYMENT_KEY : "");

  if (!deploymentKey) {
    if (!isDev && !isRuntimeTestEnv()) {
      console.error(
        `${LOG_MESSAGES.EXPERIMENT_PREFIX} ${LOG_MESSAGES.MISSING_KEY}`,
      );
    }
    return;
  }

  try {
    client = Experiment.initialize(deploymentKey, CONFIG);
  } catch (e) {
    console.error(
      `${LOG_MESSAGES.EXPERIMENT_PREFIX} ${LOG_MESSAGES.INIT_FAILED}`,
      e,
    );
  }
};

let sessionAnonymousDeviceId: string | null = null;

// 128 random bits as hex; getRandomValues is available in every surface
// this runs in, unlike randomUUID.
const randomHexId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

/**
 * A random per-install id for bucketing flag fetches while data sharing is
 * off. Amplitude's evaluation can't bucket a user with no id at all and
 * falls to the segment default, which would turn kill switches and the
 * maintenance screen off for every opted-out user. This id is not the
 * analytics device_id, is never replaced by the wallet-derived user id, and
 * is sent only on the Experiment fetch.
 */
export const getAnonymousExperimentDeviceId = (): string => {
  if (sessionAnonymousDeviceId) return sessionAnonymousDeviceId;
  try {
    const stored = localStorage.getItem(EXPERIMENT_ANONYMOUS_DEVICE_ID);
    if (stored) {
      sessionAnonymousDeviceId = stored;
      return stored;
    }
  } catch {
    // Storage unavailable: fall through and hold the id for this popup only.
  }
  const fresh = randomHexId();
  try {
    localStorage.setItem(EXPERIMENT_ANONYMOUS_DEVICE_ID, fresh);
  } catch {
    // see above
  }
  sessionAnonymousDeviceId = fresh;
  return fresh;
};

/**
 * Returns the initialized Amplitude Experiment client, or `null` if
 * `initExperimentClient` has not yet been called or initialization failed.
 *
 * @returns The active `ExperimentClient` or `null`
 */
export const getExperimentClient = (): ExperimentClient | null => client;
