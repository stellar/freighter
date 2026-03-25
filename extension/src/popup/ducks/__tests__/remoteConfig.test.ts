import { configureStore } from "@reduxjs/toolkit";

import {
  fetchFeatureFlags,
  maintenanceBannerSelector,
  maintenanceScreenSelector,
  isRemoteConfigInitializedSelector,
  reducer,
} from "../remoteConfig";
import {
  BannerTheme,
  type MaintenanceBannerContent,
  type MaintenanceScreenContent,
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

  it("has both maintenance flags disabled with no payload by default", () => {
    const store = makeStore();
    const state = getState(store);
    expect(state.maintenance_banner).toEqual({
      enabled: false,
      payload: undefined,
    });
    expect(state.maintenance_screen).toEqual({
      enabled: false,
      payload: undefined,
    });
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
    expect(state.maintenance_banner.enabled).toBe(false);
    expect(state.maintenance_screen.enabled).toBe(false);
  });
});

describe("remoteConfig duck — fetchFeatureFlags with live client", () => {
  const bannerPayload = {
    theme: "warning",
    banner: { title: { en: "Services degraded" } },
  };
  const screenPayload = {
    content: {
      title: { en: "Under Maintenance" },
      body: { en: ["We'll be back soon."] },
    },
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

  it("enables maintenance_banner when variant is 'on'", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "on", payload: bannerPayload },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const flag = getState(store).maintenance_banner;
    expect(flag.enabled).toBe(true);
    expect(flag.payload).toEqual(bannerPayload);
  });

  it("enables maintenance_screen when variant is 'on'", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_screen: { value: "on", payload: screenPayload },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const flag = getState(store).maintenance_screen;
    expect(flag.enabled).toBe(true);
    expect(flag.payload).toEqual(screenPayload);
  });

  it.each(["on", "true", "enabled", "yes"])(
    "recognizes '%s' as an on-variant value",
    async (value) => {
      (getExperimentClient as jest.Mock).mockReturnValue(
        makeClient({
          maintenance_banner: { value, payload: bannerPayload },
        }),
      );

      const store = makeStore();
      await store.dispatch(fetchFeatureFlags());
      expect(getState(store).maintenance_banner.enabled).toBe(true);
    },
  );

  it("disables banner when variant value is off", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "off", payload: bannerPayload },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    expect(getState(store).maintenance_banner.enabled).toBe(false);
    expect(getState(store).maintenance_banner.payload).toBeUndefined();
  });

  it("stores payload as undefined when variant is off", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "off", payload: bannerPayload },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    expect(getState(store).maintenance_banner.payload).toBeUndefined();
  });

  it("enables both flags simultaneously", async () => {
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "on", payload: bannerPayload },
        maintenance_screen: { value: "on", payload: screenPayload },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());
    const state = getState(store);
    expect(state.maintenance_banner.enabled).toBe(true);
    expect(state.maintenance_screen.enabled).toBe(true);
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
    expect(state.maintenance_banner.enabled).toBe(false);
    expect(state.maintenance_screen.enabled).toBe(false);
  });
});

describe("remoteConfig selectors", () => {
  const bannerContent: MaintenanceBannerContent = {
    theme: BannerTheme.warning,
    bannerTitle: "Services degraded",
    url: "https://status.stellar.org",
  };
  const screenContent: MaintenanceScreenContent = {
    title: "Under Maintenance",
    body: ["We'll be back soon."],
  };

  afterEach(() => jest.clearAllMocks());

  it("maintenanceBannerSelector returns disabled when flag is off", () => {
    const store = makeStore();
    expect(maintenanceBannerSelector(store.getState())).toEqual({
      enabled: false,
      content: null,
    });
  });

  it("maintenanceScreenSelector returns disabled when flag is off", () => {
    const store = makeStore();
    expect(maintenanceScreenSelector(store.getState())).toEqual({
      enabled: false,
      content: null,
    });
  });

  it("maintenanceBannerSelector parses payload when enabled", async () => {
    (parseBannerPayload as jest.Mock).mockReturnValue(bannerContent);
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "on", payload: { raw: true } },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());

    const result = maintenanceBannerSelector(store.getState());
    expect(parseBannerPayload).toHaveBeenCalledWith({ raw: true });
    expect(result).toEqual({ enabled: true, content: bannerContent });
  });

  it("maintenanceScreenSelector parses payload when enabled", async () => {
    (parseScreenPayload as jest.Mock).mockReturnValue(screenContent);
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_screen: { value: "on", payload: { raw: true } },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());

    const result = maintenanceScreenSelector(store.getState());
    expect(parseScreenPayload).toHaveBeenCalledWith({ raw: true });
    expect(result).toEqual({ enabled: true, content: screenContent });
  });

  it("maintenanceBannerSelector returns disabled when parser returns null", async () => {
    (parseBannerPayload as jest.Mock).mockReturnValue(null);
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "on", payload: { bad: true } },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());

    const result = maintenanceBannerSelector(store.getState());
    expect(result).toEqual({ enabled: false, content: null });
  });

  it("maintenanceBannerSelector degrades gracefully when parser throws", async () => {
    (parseBannerPayload as jest.Mock).mockImplementation(() => {
      throw new Error("unexpected payload shape");
    });
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_banner: { value: "on", payload: { corrupt: true } },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());

    // The selector propagates the throw — callers must handle it.
    expect(() => maintenanceBannerSelector(store.getState())).toThrow(
      "unexpected payload shape",
    );
  });

  it("maintenanceScreenSelector degrades gracefully when parser throws", async () => {
    (parseScreenPayload as jest.Mock).mockImplementation(() => {
      throw new Error("bad screen payload");
    });
    (getExperimentClient as jest.Mock).mockReturnValue(
      makeClient({
        maintenance_screen: { value: "on", payload: { corrupt: true } },
      }),
    );

    const store = makeStore();
    await store.dispatch(fetchFeatureFlags());

    expect(() => maintenanceScreenSelector(store.getState())).toThrow(
      "bad screen payload",
    );
  });

  it("isRemoteConfigInitializedSelector returns false initially", () => {
    const store = makeStore();
    expect(isRemoteConfigInitializedSelector(store.getState())).toBe(false);
  });
});
