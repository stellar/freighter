import { Experiment, ExperimentClient } from "@amplitude/experiment-js-client";

import { AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY } from "constants/env";
import { isDev } from "@shared/helpers/dev";

let client: ExperimentClient | null = null;

/**
 * Initializes the Amplitude Experiment client using the paired analytics SDK.
 * Must be called after `amplitude.init()` so that the experiment client can
 * share the same user identity.
 *
 * Silently skips initialization in development when no key is configured.
 */
export const initExperimentClient = (): void => {
  if (!AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY) {
    if (!isDev) {
      console.error(
        "[Experiment] Missing AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY — feature flags will not be fetched",
      );
    }
    return;
  }

  try {
    client = Experiment.initializeWithAmplitudeAnalytics(
      AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY,
    );
  } catch (e) {
    console.error("[Experiment] Failed to initialize", e);
  }
};

/**
 * Returns the initialized Amplitude Experiment client, or `null` if
 * `initExperimentClient` has not yet been called or initialization failed.
 *
 * @returns The active `ExperimentClient` or `null`
 */
export const getExperimentClient = (): ExperimentClient | null => client;
