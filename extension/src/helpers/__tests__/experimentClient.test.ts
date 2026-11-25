jest.mock("constants/env", () => ({
  AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY: "test-deployment-key",
}));

jest.mock("@amplitude/experiment-js-client", () => ({
  Experiment: {
    initialize: jest.fn(() => ({ client: "plain" })),
    initializeWithAmplitudeAnalytics: jest.fn(() => ({
      client: "with-analytics",
    })),
  },
}));

import { Experiment } from "@amplitude/experiment-js-client";
import { getExperimentClient, initExperimentClient } from "../experimentClient";

describe("initExperimentClient", () => {
  it("initializes the client without the analytics identity integration", () => {
    // initializeWithAmplitudeAnalytics copies user_id and device_id from the
    // analytics SDK into every flag fetch, bypassing the data-sharing setting.
    initExperimentClient();

    expect(Experiment.initialize).toHaveBeenCalledWith(
      "test-deployment-key",
      // Retries are what refresh the stored flags for the next open when the
      // popup's own fetch times out on a slow link.
      expect.objectContaining({ fetchTimeoutMillis: 1500 }),
    );
    expect(Experiment.initialize).toHaveBeenCalledWith(
      "test-deployment-key",
      expect.not.objectContaining({ retryFetchOnFailure: false }),
    );
    expect(Experiment.initializeWithAmplitudeAnalytics).not.toHaveBeenCalled();
    expect(getExperimentClient()).toEqual({ client: "plain" });
  });
});
