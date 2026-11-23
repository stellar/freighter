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
      // A retry would re-send the identity captured at fetch time after the
      // user may have turned data sharing off.
      expect.objectContaining({ retryFetchOnFailure: false }),
    );
    expect(Experiment.initializeWithAmplitudeAnalytics).not.toHaveBeenCalled();
    expect(getExperimentClient()).toEqual({ client: "plain" });
  });
});
