import browser from "webextension-polyfill";
import * as internal from "@shared/api/internal";
import * as metrics from "helpers/metrics";
import {
  getThemePreferenceInEffect,
  initColorScheme,
  setThemePreference,
} from "popup/helpers/systemTheme";
import {
  selectThemePreference,
  syncThemePreferenceFromStorage,
} from "popup/helpers/themePreference";
import * as themeMetrics from "popup/metrics/theme";

jest.mock("@shared/api/internal", () => ({ saveThemePreference: jest.fn() }));
jest.mock("helpers/metrics", () => ({ syncPreferredThemeTrait: jest.fn() }));
jest.mock("popup/metrics/theme", () => ({ emitThemeChanged: jest.fn() }));
jest.mock("webextension-polyfill", () => {
  const listeners: Array<(changes: object, areaName: string) => void> = [];
  return {
    storage: {
      local: { get: jest.fn() },
      onChanged: {
        addListener: (l: (typeof listeners)[number]) => listeners.push(l),
        emit: (changes: object, areaName: string) =>
          listeners.forEach((l) => l(changes, areaName)),
      },
    },
  };
});

const mockedInternal = internal as jest.Mocked<typeof internal>;
const mockedStorageGet = browser.storage.local.get as jest.Mock;
const mockedMetrics = metrics as jest.Mocked<typeof metrics>;
const mockedThemeMetrics = themeMetrics as jest.Mocked<typeof themeMetrics>;

describe("themePreference", () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
    }));
    initColorScheme();
  });

  afterEach(() => {
    jest.resetAllMocks();
    setThemePreference("system");
    document.body.className = "";
  });

  it("adopts the chrome.storage value at startup", async () => {
    mockedStorageGet.mockResolvedValue({ themePreference: "dark" });
    await syncThemePreferenceFromStorage();
    expect(getThemePreferenceInEffect()).toBe("dark");
    expect(document.body.classList.contains("sds-theme-dark")).toBe(true);
  });

  it("updates preferred_theme only when the stored value is applied", async () => {
    mockedStorageGet.mockResolvedValue({ themePreference: "dark" });
    await syncThemePreferenceFromStorage();
    expect(mockedMetrics.syncPreferredThemeTrait).toHaveBeenCalledWith("dark");

    mockedMetrics.syncPreferredThemeTrait.mockClear();
    await syncThemePreferenceFromStorage();
    expect(mockedMetrics.syncPreferredThemeTrait).not.toHaveBeenCalled();
  });

  it("ignores a stored value read before a newer change", async () => {
    let reply: (value: { themePreference: string }) => void = () => {};
    mockedStorageGet.mockReturnValue(
      new Promise((resolve) => {
        reply = resolve;
      }),
    );
    const sync = syncThemePreferenceFromStorage();

    setThemePreference("dark");
    reply({ themePreference: "light" });
    await sync;

    expect(getThemePreferenceInEffect()).toBe("dark");
    expect(mockedMetrics.syncPreferredThemeTrait).not.toHaveBeenCalled();
  });

  it("stays on the default when the background is unreachable", async () => {
    mockedStorageGet.mockRejectedValue(new Error("unavailable"));
    await syncThemePreferenceFromStorage();
    expect(getThemePreferenceInEffect()).toBe("system");
  });

  describe("selectThemePreference", () => {
    // Saves that resolve only when the test says so, in any order.
    const deferSaves = () => {
      const pending: Array<() => void> = [];
      mockedInternal.saveThemePreference.mockImplementation(
        (p) =>
          new Promise((resolve) => {
            pending.push(() => resolve(p));
          }),
      );
      return pending;
    };

    it("applies before persisting, then reports the change", async () => {
      let appliedAtSave: string | undefined;
      mockedInternal.saveThemePreference.mockImplementation(async (p) => {
        appliedAtSave = getThemePreferenceInEffect();
        return p;
      });
      await selectThemePreference("dark");

      expect(appliedAtSave).toBe("dark");
      expect(mockedInternal.saveThemePreference).toHaveBeenCalledWith("dark");
      expect(mockedThemeMetrics.emitThemeChanged).toHaveBeenCalledWith({
        preference: "dark",
        previous: "system",
        colorScheme: "dark",
      });
      expect(mockedMetrics.syncPreferredThemeTrait).toHaveBeenCalledWith(
        "dark",
        { force: true },
      );
    });

    it("reports nothing when the save fails", async () => {
      mockedInternal.saveThemePreference.mockRejectedValue(new Error("no bg"));
      await expect(selectThemePreference("dark")).rejects.toThrow("no bg");
      expect(mockedThemeMetrics.emitThemeChanged).not.toHaveBeenCalled();
      expect(mockedMetrics.syncPreferredThemeTrait).not.toHaveBeenCalled();
    });

    it("does nothing when the choice is already in effect", async () => {
      await selectThemePreference("system");
      expect(mockedInternal.saveThemePreference).not.toHaveBeenCalled();
    });

    it("labels overlapping picks correctly when saves finish out of order", async () => {
      const pending = deferSaves();
      const dark = selectThemePreference("dark");
      const light = selectThemePreference("light");

      pending[1]();
      await light;
      pending[0]();
      await dark;

      expect(mockedThemeMetrics.emitThemeChanged).toHaveBeenNthCalledWith(1, {
        preference: "light",
        previous: "dark",
        colorScheme: "light",
      });
      expect(mockedThemeMetrics.emitThemeChanged).toHaveBeenNthCalledWith(2, {
        preference: "dark",
        previous: "system",
        colorScheme: "dark",
      });
      expect(mockedMetrics.syncPreferredThemeTrait).toHaveBeenCalledTimes(1);
      expect(mockedMetrics.syncPreferredThemeTrait).toHaveBeenCalledWith(
        "light",
        { force: true },
      );
    });

    it("doesn't overwrite a newer pick from another page when its save finishes late", async () => {
      const pending = deferSaves();
      const dark = selectThemePreference("dark");

      // Another page picks Light and saves it to chrome.storage.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (browser.storage.onChanged as any).emit(
        { themePreference: { newValue: "light" } },
        "local",
      );

      pending[0]();
      await dark;

      expect(mockedThemeMetrics.emitThemeChanged).toHaveBeenCalledWith({
        preference: "dark",
        previous: "system",
        colorScheme: "dark",
      });
      expect(mockedMetrics.syncPreferredThemeTrait).not.toHaveBeenCalled();
    });
  });
});
