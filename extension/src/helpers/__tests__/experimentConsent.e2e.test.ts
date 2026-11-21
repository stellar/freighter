/**
 * End-to-end check of the data-sharing gate on the feature-flag fetch: the
 * real analytics and Experiment SDKs, the real initAmplitude and
 * fetchFeatureFlags, and a stubbed global fetch that records what would have
 * left the extension.
 */
jest.unmock("helpers/metrics");
jest.unmock("@amplitude/analytics-browser");

jest.mock("constants/env", () => ({
  AMPLITUDE_KEY: "test-analytics-key",
  AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY: "test-deployment-key",
  APP_VERSION: "9.9.9",
  BUILD_TYPE: "development",
  METRICS_PLATFORM: "WEB",
}));
jest.mock("popup/App", () => ({
  store: { getState: jest.fn(() => ({})), subscribe: jest.fn() },
}));
jest.mock("popup/ducks/accountServices", () => ({
  publicKeySelector: jest.fn(),
  allAccountsSelector: jest.fn(() => []),
}));
jest.mock("popup/ducks/settings", () => ({
  settingsDataSharingSelector: (state: {
    settings: { isDataSharingAllowed: boolean };
  }) => state.settings.isDataSharingAllowed,
  settingsNetworkDetailsSelector: jest.fn(() => ({ network: "TESTNET" })),
}));
jest.mock("popup/ducks/cache", () => ({
  balancesSelector: jest.fn(() => ({})),
}));
jest.mock("popup/helpers/isSidebarMode", () => ({
  isSidebarMode: jest.fn(() => false),
}));
jest.mock("webextension-polyfill", () => ({
  tabs: { getCurrent: jest.fn() },
  runtime: { getManifest: jest.fn(() => ({ version: "9.9.9" })) },
}));

import { configureStore } from "@reduxjs/toolkit";
import { METRICS_USER_ID } from "constants/localStorageTypes";

const SEED_DERIVED_ID = "ab".repeat(32);
const originalFetch = global.fetch;

type RecordedRequest = { url: string; headers: Record<string, string> };

const decodeExpUser = (request: RecordedRequest | undefined) => {
  const header = request?.headers["X-Amp-Exp-User"];
  if (!header) {
    throw new Error("no X-Amp-Exp-User header");
  }
  return JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
};

const runFlagFetch = async (isDataSharingAllowed: boolean) => {
  const requests: RecordedRequest[] = [];
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    requests.push({
      url: String(url),
      headers: (init?.headers as Record<string, string>) || {},
    });
    return {
      ok: true,
      status: 200,
      text: async () => "{}",
      json: async () => ({}),
      headers: new Headers(),
    } as Response;
  }) as unknown as typeof fetch;
  localStorage.setItem(METRICS_USER_ID, SEED_DERIVED_ID);

  // Fresh module registry per run: initAmplitude and the Experiment factory
  // are both once-only singletons.
  let metrics: typeof import("helpers/metrics");
  let remoteConfig: typeof import("popup/ducks/remoteConfig");
  let amplitude: typeof import("@amplitude/analytics-browser");
  jest.isolateModules(() => {
    const appStore = require("popup/App").store as { getState: jest.Mock };
    appStore.getState.mockReturnValue({ settings: { isDataSharingAllowed } });
    metrics = require("helpers/metrics");
    remoteConfig = require("popup/ducks/remoteConfig");
    amplitude = require("@amplitude/analytics-browser");
  });

  await metrics!.initAmplitude();
  // The analytics SDK assigns its device id asynchronously after init.
  for (let i = 0; i < 50 && !amplitude!.getDeviceId(); i += 1) {
    await new Promise((r) => setTimeout(r, 20));
  }

  const store = configureStore({
    reducer: { remoteConfig: remoteConfig!.reducer },
  });
  await store.dispatch(
    remoteConfig!.fetchFeatureFlags({ isDataSharingAllowed }),
  );

  const flagRequest = requests.find((r) => r.url.includes("lab.amplitude.com"));
  return { user: decodeExpUser(flagRequest), amplitude: amplitude! };
};

describe("feature-flag fetch identity vs data-sharing consent", () => {
  afterEach(() => {
    localStorage.clear();
    global.fetch = originalFetch;
  });

  it("sends neither the user_id nor the analytics device_id when data sharing is off", async () => {
    const { user, amplitude } = await runFlagFetch(false);

    expect(amplitude.getOptOut()).toBe(true);
    expect(user).not.toHaveProperty("user_id");
    expect(user.device_id).toBeDefined();
    expect(user.device_id).not.toBe(amplitude.getDeviceId());
    expect(user.user_properties).toEqual(
      expect.objectContaining({ "Bundle Id": "extension.development" }),
    );
  });

  it("buckets opted-out fetches on the same per-install id each time", async () => {
    const first = await runFlagFetch(false);
    const second = await runFlagFetch(false);

    expect(second.user.device_id).toBe(first.user.device_id);
  });

  it("sends the analytics user_id and device_id when data sharing is on", async () => {
    const { user, amplitude } = await runFlagFetch(true);

    expect(amplitude.getOptOut()).toBe(false);
    expect(user.user_id).toBe(SEED_DERIVED_ID);
    expect(user.device_id).toBe(amplitude.getDeviceId());
  });
});
