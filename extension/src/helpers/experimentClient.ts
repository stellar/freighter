import {
  Experiment,
  ExperimentClient,
  ExperimentConfig,
} from "@amplitude/experiment-js-client";

import { AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY } from "constants/env";
import { isDev } from "@shared/helpers/dev";

const TEST_EXPERIMENT_DEPLOYMENT_KEY = "playwright-test-deployment-key";

// Balance and price fetches wait on the flags, so a slow Amplitude host holds
// the spinner for this long before falling back to the last stored flags.
// SDK retries stay on: while the view stays open they refresh the stored
// flags for the next open. A retry re-sends the user captured when its fetch
// started, and nothing cancels pending retries when data sharing is turned
// off, so ids can still go out for up to ~1.5 minutes after opt-out.
const CONFIG: ExperimentConfig = { fetchTimeoutMillis: 1500 };

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

/**
 * Returns the initialized Amplitude Experiment client, or `null` if
 * `initExperimentClient` has not yet been called or initialization failed.
 *
 * @returns The active `ExperimentClient` or `null`
 */
export const getExperimentClient = (): ExperimentClient | null => client;
