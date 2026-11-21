import React from "react";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";

import { SettingsState } from "@shared/api/types";
import * as ApiInternal from "@shared/api/internal";
import { makeDummyStore } from "popup/__testHelpers__";
import * as RemoteConfig from "popup/ducks/remoteConfig";
import { settingsStateSelector } from "popup/ducks/settings";
import { useRemoteConfig } from "../useRemoteConfig";

const flush = () => new Promise((r) => setTimeout(r, 0));

const render = () => {
  const store = makeDummyStore({
    settings: { settingsState: SettingsState.IDLE },
  });
  const fetchFeatureFlags = jest
    .spyOn(RemoteConfig, "fetchFeatureFlags")
    .mockReturnValue((() => Promise.resolve()) as any);
  const hook = renderHook(() => useRemoteConfig(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
  return { store, fetchFeatureFlags, hook };
};

describe("useRemoteConfig", () => {
  let loadSettings: jest.SpyInstance;

  beforeEach(() => {
    loadSettings = jest.spyOn(ApiInternal, "loadSettings");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches with the data-sharing setting read from the background", async () => {
    loadSettings.mockResolvedValue({ isDataSharingAllowed: true } as any);
    const { fetchFeatureFlags } = render();
    await flush();

    expect(loadSettings).toHaveBeenCalledTimes(1);
    expect(fetchFeatureFlags).toHaveBeenCalledTimes(1);
    expect(fetchFeatureFlags).toHaveBeenCalledWith({
      isDataSharingAllowed: true,
    });
  });

  it("does not hydrate the settings slice, so the analytics keyed off it stay as they were", async () => {
    // Onboarding and the lock screen never load settings; hydrating them
    // from here would switch on screen views, app.opened and Sentry there.
    loadSettings.mockResolvedValue({ isDataSharingAllowed: true } as any);
    const { store } = render();
    await flush();

    expect(settingsStateSelector(store.getState())).toBe(SettingsState.IDLE);
  });

  it("fetches anonymously when the settings read fails, so waiters don't hang", async () => {
    loadSettings.mockRejectedValue(new Error("no background"));
    const { fetchFeatureFlags } = render();
    await flush();

    expect(fetchFeatureFlags).toHaveBeenCalledWith({
      isDataSharingAllowed: false,
    });
  });

  it("fetches once per popup even across re-renders", async () => {
    loadSettings.mockResolvedValue({ isDataSharingAllowed: false } as any);
    const { fetchFeatureFlags, hook } = render();
    hook.rerender();
    await flush();
    hook.rerender();
    await flush();

    expect(loadSettings).toHaveBeenCalledTimes(1);
    expect(fetchFeatureFlags).toHaveBeenCalledTimes(1);
  });
});
