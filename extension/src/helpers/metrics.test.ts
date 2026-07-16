// config/jest/setupTests.tsx globally stubs "helpers/metrics" (and
// "popup/App") for every test file so unrelated suites don't have to deal
// with Amplitude/store internals. This file resolves to the same module
// (by absolute path) via the relative "./metrics" import below, so we must
// un-mock it here to exercise the real implementation.
jest.unmock("helpers/metrics");

import * as amplitude from "@amplitude/analytics-browser";
import * as Sentry from "@sentry/browser";

import { getAnalyticsUserId } from "@shared/api/internal";
import { METRICS_USER_ID } from "constants/localStorageTypes";
import { initAmplitude, reconcileAnalyticsUserId } from "./metrics";

jest.mock("@amplitude/analytics-browser", () => ({
  init: jest.fn(),
  setUserId: jest.fn(),
  identify: jest.fn(),
  Identify: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
  setOptOut: jest.fn(),
  track: jest.fn(),
  flush: jest.fn(),
}));

jest.mock("@sentry/browser", () => ({
  setUser: jest.fn(),
}));

jest.mock("@shared/api/internal", () => ({
  getAnalyticsUserId: jest.fn(),
}));

jest.mock("popup/App", () => ({
  store: {
    getState: jest.fn().mockReturnValue({}),
    subscribe: jest.fn(),
  },
}));

jest.mock("helpers/experimentClient", () => ({
  initExperimentClient: jest.fn(),
}));

jest.mock("popup/ducks/settings", () => ({
  settingsDataSharingSelector: jest.fn().mockReturnValue(true),
  settingsNetworkDetailsSelector: jest.fn().mockReturnValue({
    network: "TESTNET",
  }),
}));

jest.mock("popup/ducks/accountServices", () => ({
  publicKeySelector: jest.fn().mockReturnValue(""),
}));

const mockGetAnalyticsUserId = getAnalyticsUserId as jest.Mock;

describe("reconcileAnalyticsUserId (auth id migration)", () => {
  beforeAll(() => {
    // Flip the module-level `hasInitialized` flag once so the
    // `hasInitialized && AMPLITUDE_KEY` guard in reconcileAnalyticsUserId
    // can be exercised. AMPLITUDE_KEY is stubbed truthy in the jest env
    // (see config/jest/setupTests.tsx).
    initAmplitude();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("overwrites a random persisted id with the auth id and re-identifies", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921"); // existing random id
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "a".repeat(64),
    });

    await reconcileAnalyticsUserId();

    expect(localStorage.getItem(METRICS_USER_ID)).toBe("a".repeat(64));
    expect(amplitude.setUserId).toHaveBeenCalledWith("a".repeat(64));
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: "a".repeat(64) });
  });

  it("is a no-op when the persisted id already equals the auth id", async () => {
    localStorage.setItem(METRICS_USER_ID, "a".repeat(64));
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "a".repeat(64),
    });

    await reconcileAnalyticsUserId();

    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it("is a no-op when locked (null auth id) — keeps the bootstrap id", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockResolvedValue({ analyticsUserId: null });

    await reconcileAnalyticsUserId();

    expect(localStorage.getItem(METRICS_USER_ID)).toBe("4873921");
    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it("never throws into callers when the background message fails", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockRejectedValue(new Error("no background"));

    await expect(reconcileAnalyticsUserId()).resolves.toBeUndefined();
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("4873921");
    expect(amplitude.setUserId).not.toHaveBeenCalled();
  });
});
