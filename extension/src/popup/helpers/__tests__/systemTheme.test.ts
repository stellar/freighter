import browser from "webextension-polyfill";
import {
  DARK_SCHEME_QUERY,
  getAppliedColorScheme,
  getSystemColorScheme,
  getThemePreferenceInEffect,
  initColorScheme,
  setThemePreference,
  subscribeToThemePreference,
  trackUnsavedPick,
} from "popup/helpers/systemTheme";

jest.mock("webextension-polyfill", () => {
  const listeners: Array<(changes: object, areaName: string) => void> = [];
  return {
    storage: {
      onChanged: {
        addListener: (l: (typeof listeners)[number]) => listeners.push(l),
        emit: (changes: object, areaName: string) =>
          listeners.forEach((l) => l(changes, areaName)),
      },
    },
  };
});

type ChangeHandler = (e: { matches: boolean }) => void;

// `matches` is for the explicit-dark query the module uses.
const mockMatchMedia = ({ prefersDark }: { prefersDark: boolean }) => {
  const listeners: ChangeHandler[] = [];
  const mql = {
    matches: prefersDark,
    media: DARK_SCHEME_QUERY,
    addEventListener: (_: string, handler: ChangeHandler) => {
      listeners.push(handler);
    },
    removeEventListener: jest.fn(),
  };
  window.matchMedia = jest.fn().mockImplementation(() => mql);
  return {
    emitChange: ({ prefersDark: next }: { prefersDark: boolean }) => {
      mql.matches = next;
      listeners.forEach((l) => l({ matches: next }));
    },
  };
};

// The background saved a value to chrome.storage.local, e.g. for another page.
const emitStorageChange = (
  changes: Record<string, { newValue?: unknown }>,
  areaName = "local",
) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (browser.storage.onChanged as any).emit(changes, areaName);

const writeFromOtherPage = (value: string) =>
  emitStorageChange({ themePreference: { newValue: value } });

describe("systemTheme", () => {
  afterEach(() => {
    document.body.className = "";
    setThemePreference("system");
  });

  describe("getSystemColorScheme", () => {
    it("is dark only on an explicit dark preference", () => {
      mockMatchMedia({ prefersDark: true });
      expect(getSystemColorScheme()).toBe("dark");
    });

    it("is light when the device prefers light", () => {
      mockMatchMedia({ prefersDark: false });
      expect(getSystemColorScheme()).toBe("light");
    });

    it("falls back to light when matchMedia is unavailable", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).matchMedia = undefined;
      expect(getSystemColorScheme()).toBe("light");
    });

    it("falls back to light when the query is unsupported (matches false)", () => {
      // An unparsed query reports matches=false — not an explicit dark
      // preference, so it must resolve light: Varial is light-first, like
      // mobile's DEFAULT_COLOR_SCHEME and the index.html fallback.
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        media: "not all",
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));
      expect(getSystemColorScheme()).toBe("light");
    });
  });

  describe("initColorScheme", () => {
    it("replaces the static light class with the device scheme", () => {
      document.body.className = "sds-theme-light";
      mockMatchMedia({ prefersDark: true });

      initColorScheme();

      expect(document.body.classList.contains("sds-theme-dark")).toBe(true);
      expect(document.body.classList.contains("sds-theme-light")).toBe(false);
    });

    it("follows live system-theme changes while the popup is open", () => {
      document.body.className = "sds-theme-light";
      const { emitChange } = mockMatchMedia({ prefersDark: false });

      initColorScheme();
      expect(document.body.classList.contains("sds-theme-light")).toBe(true);

      emitChange({ prefersDark: true });
      expect(document.body.classList.contains("sds-theme-dark")).toBe(true);
      expect(document.body.classList.contains("sds-theme-light")).toBe(false);

      emitChange({ prefersDark: false });
      expect(document.body.classList.contains("sds-theme-light")).toBe(true);
      expect(document.body.classList.contains("sds-theme-dark")).toBe(false);
    });

    it("keeps unrelated body classes intact", () => {
      document.body.className = "sds-theme-light some-other-class";
      mockMatchMedia({ prefersDark: true });

      initColorScheme();

      expect(document.body.classList.contains("some-other-class")).toBe(true);
    });
  });

  describe("theme preference", () => {
    const isDark = () => document.body.classList.contains("sds-theme-dark");
    const isLight = () => document.body.classList.contains("sds-theme-light");

    it("defaults to system when nothing is stored", () => {
      mockMatchMedia({ prefersDark: true });
      initColorScheme();
      expect(getThemePreferenceInEffect()).toBe("system");
      expect(isDark()).toBe(true);
    });

    it("falls back to system for an unknown stored value", () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      setThemePreference("dark");
      writeFromOtherPage("sepia");
      expect(getThemePreferenceInEffect()).toBe("system");
      expect(isLight()).toBe(true);
    });

    it("ignores live system changes while pinned", () => {
      const { emitChange } = mockMatchMedia({ prefersDark: false });
      initColorScheme();
      setThemePreference("light");

      emitChange({ prefersDark: true });
      expect(isLight()).toBe(true);
      expect(isDark()).toBe(false);
    });

    it("resumes following the device after switching back to system", () => {
      const { emitChange } = mockMatchMedia({ prefersDark: false });
      initColorScheme();
      setThemePreference("dark");
      expect(isDark()).toBe(true);

      setThemePreference("system");
      expect(isLight()).toBe(true);

      emitChange({ prefersDark: true });
      expect(isDark()).toBe(true);
    });

    it("applies a change made in another extension page", () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      expect(isLight()).toBe(true);

      writeFromOtherPage("dark");
      expect(getThemePreferenceInEffect()).toBe("dark");
      expect(isDark()).toBe(true);
    });

    it("ignores other storage keys and areas", () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();

      emitStorageChange({ isHideDustEnabled: { newValue: true } });
      emitStorageChange({ themePreference: { newValue: "dark" } }, "session");
      expect(getThemePreferenceInEffect()).toBe("system");
    });

    it("ignores a late event for this page's own earlier, unsaved pick", async () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      let finishSave: () => void = () => {};
      setThemePreference("dark");
      const save = trackUnsavedPick(
        "dark",
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
      );
      setThemePreference("light");

      writeFromOtherPage("dark");
      expect(getThemePreferenceInEffect()).toBe("light");
      expect(isLight()).toBe(true);

      finishSave();
      await save;
      writeFromOtherPage("dark");
      expect(getThemePreferenceInEffect()).toBe("dark");
    });
  });

  describe("subscribeToThemePreference", () => {
    it("notifies on local changes and changes from another page", () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      const listener = jest.fn();
      const unsubscribe = subscribeToThemePreference(listener);

      setThemePreference("dark");
      writeFromOtherPage("light");
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
      setThemePreference("system");
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAppliedColorScheme", () => {
    it("reports the class actually on the body, not the media query", () => {
      // A pinned preference sets the class without the media query changing.
      mockMatchMedia({ prefersDark: false });
      document.body.className = "sds-theme-dark";
      expect(getAppliedColorScheme()).toBe("dark");
    });

    it("defaults to light when no theme class is present", () => {
      document.body.className = "";
      expect(getAppliedColorScheme()).toBe("light");
    });
  });
});
