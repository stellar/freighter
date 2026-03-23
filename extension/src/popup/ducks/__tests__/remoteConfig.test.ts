import { configureStore } from "@reduxjs/toolkit";

import {
  fetchFeatureFlags,
  maintenanceBannerSelector,
  maintenanceScreenSelector,
  isRemoteConfigInitializedSelector,
  reducer,
} from "../remoteConfig";
import type {
  MaintenanceBannerContent,
  MaintenanceScreenContent,
} from "popup/helpers/maintenance/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("helpers/experimentClient", () => ({
  getExperimentClient: jest.fn(),
}));

jest.mock("popup/helpers/maintenance/parseMaintenanceContent", () => ({
  parseBannerPayload: jest.fn(),
  parseScreenPayload: jest.fn(),
}));

// Typed references to the mocked functions
const { getExperimentClient } = jest.requireMock<
  typeof import("helpers/experimentClient")
>("helpers/experimentClient");

const { parseBannerPayload, parseScreenPayload } = jest.requireMock<
  typeof import("popup/helpers/maintenance/parseMaintenanceContent")
>("popup/helpers/maintenance/parseMaintenanceContent");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore() {
  return configureStore({ reducer: { remoteConfig: reducer } });
}

type TestStore = ReturnType<typeof makeStore>;

function getState(store: TestStore) {
  return store.getState().remoteConfig;
}

function makeClient(
  variants: Record<string, { value: string; payload?: unknown }> = {},
) {
  return {
    fetch: jest.fn().mockResolvedValue(undefined),
    all: jest.fn().mockReturnValue(variants),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("remoteConfig duck — initial state", () => {
  it("has isInitialized: false by default", () => {
    const store = makeStore();
    expect(getState(store).isInitialized).toBe(false);
  });

  it("has both maintenance flags disabled and content null by default", () => {
    const store = makeStore();
    const state = getState(store);
    expect(state.maintenanceBanner).toEqual({ enabled: false, content: null });
    expect(state.maintenanceScreen).toEqual({ enabled: false, content: null });
  });
});

describe("remoteConfig duck — fetchFeatureFlags when experiment client is null", () => {
  beforeEach(() => {
    (getExperimentClient as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  it("sets isInitialized: true and keeps flags disabled", async () => {
    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const state = getState(store);
    expect(state.isInitialized).toBe(true);
    expect(state.maintenanceBanner.enabled).toBe(false);
    expect(state.maintenanceScreen.enabled).toBe(false);
  });
});

describe("remoteConfig duck — fetchFeatureFlags with live client", () => {
  const bannerContent: MaintenanceBannerContent = {
    theme: "warning",
    bannerTitle: "Services degraded",
    url: "https://status.stellar.org",
  };
  const screenContent: MaintenanceScreenContent = {
    title: "Under Maintenance",
    body: ["We'll be back soon."],
  };

  beforeEach(() => {
    (parseBannerPayload as jest.Mock).mockReturnValue(null);
    (parseScreenPayload as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  it("calls client.fetch() and client.all()", async () => {
    const client = makeClient();
    (getExperimentClient as jest.Mock).mockReturnValue(client);

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    expect(client.fetch).toHaveBeenCalledTimes(1);
    expect(client.all).toHaveBeenCalledTimes(1);
  });

  it("marks as initialized after a successful fetch", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue(makeClient());

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    expect(getState(store).isInitialized).toBe(true);
  });

  it("enables maintenance_banner when variant is 'on' and payload parses", async () => {
    (parseBannerPayload as jest.Mock).mockReturnValue(bannerContent);
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({ maintenance_banner: { value: "on", payload: {} } }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const { maintenanceBanner } = getState(store);
    expect(maintenanceBanner.enabled).toBe(true);
    expect(maintenanceBanner.content).toEqual(bannerContent);
  });

  it("enables maintenance_screen when variant is 'on' and payload parses", async () => {
    (parseScreenPayload as jest.Mock).mockReturnValue(screenContent);
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({ maintenance_screen: { value: "on", payload: {} } }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const { maintenanceScreen } = getState(store);
    expect(maintenanceScreen.enabled).toBe(true);
    expect(maintenanceScreen.content).toEqual(screenContent);
  });

  it.each(["on", "true", "enabled", "yes"])(
    "recognizes '%s' as an on-variant value",
    async (value) => {
      (parseBannerPayload as jest.Mock).mockReturnValue(bannerContent);
      (getExperimentClient as jest.Mock).mockReturnValue(
        makeClient({ maintenance_banner: { value, payload: {} } }),
      );

      const store = makeStore();
      await store.dispatch(fetchFeatureFlags());
      expect(getState(store).maintenanceBanner.enabled).toBe(true);
    },
  );

  it("disables banner when variant value is off", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({ maintenance_banner: { value: "off", payload: {} } }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    expect(getState(store).maintenanceBanner.enabled).toBe(false);
  });

  it("disables banner when payload parse returns null (even if variant is on)", async () => {
    (parseBannerPayload as jest.Mock).mockReturnValue(null);
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({ maintenance_banner: { value: "on", payload: null } }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    expect(getState(store).maintenanceBanner.enabled).toBe(false);
    expect(getState(store).maintenanceBanner.content).toBeNull();
  });

  it("enables both flags simultaneously", async () => {
    (parseBannerPayload as jest.Mock).mockReturnValue(bannerContent);
    (parseScreenPayload as jest.Mock).mockReturnValue(screenContent);
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "on", payload: {} },
        maintenance_screen: { value: "on", payload: {} },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const state = getState(store);
    expect(state.maintenanceBanner.enabled).toBe(true);
    expect(state.maintenanceScreen.enabled).toBe(true);
  });
});

describe("remoteConfig duck — error handling", () => {
  afterEach(() => jest.clearAllMocks());

  it("sets isInitialized: true and keeps safe defaults on rejection", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue({
      fetch: jest.fn().mockRejectedValue(new Error("Network error")),
      all: jest.fn().mockReturnValue({}),
    });

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const state = getState(store);
    expect(state.isInitialized).toBe(true);
    expect(state.maintenanceBanner.enabled).toBe(false);
    expect(state.maintenanceScreen.enabled).toBe(false);
  });
});

describe("remoteConfig selectors", () => {
  it("maintenanceBannerSelector returns banner slice", () => {
    const store = makeStore();
    expect(maintenanceBannerSelector(store.getState())).toEqual({
      enabled: false,
      content: null,
    });
  });

  it("maintenanceScreenSelector returns screen slice", () => {
    const store = makeStore();
    expect(maintenanceScreenSelector(store.getState())).toEqual({
      enabled: false,
      content: null,
    });
  });

  it("isRemoteConfigInitializedSelector returns false initially", () => {
    const store = makeStore();
    expect(isRemoteConfigInitializedSelector(store.getState())).toBe(false);
  });
});
