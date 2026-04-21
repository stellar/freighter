import { Experiment, ExperimentClient } from "@amplitude/experiment-js-client";

import { AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY } from "constants/env";
import { isDev } from "@shared/helpers/dev";

const TEST_EXPERIMENT_DEPLOYMENT_KEY = "playwright-test-deployment-key";

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
 * Initializes the Amplitude Experiment client using the paired analytics SDK.
 * Must be called after `amplitude.init()` so that the experiment client can
 * share the same user identity.
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
    client = AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY
      ? Experiment.initializeWithAmplitudeAnalytics(deploymentKey)
      : Experiment.initialize(deploymentKey);
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
