import {
  DARK_SCHEME_QUERY,
  THEME_PREFERENCE_MIRROR_KEY,
  getAppliedColorScheme,
  getSystemColorScheme,
  getThemePreferenceInEffect,
  initColorScheme,
  setThemePreference,
  subscribeToThemePreference,
} from "popup/helpers/systemTheme";

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

// Another page writes the shared mirror, then the browser notifies this one.
const writeFromOtherPage = (value: string) => {
  localStorage.setItem(THEME_PREFERENCE_MIRROR_KEY, value);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: THEME_PREFERENCE_MIRROR_KEY,
      newValue: value,
    }),
  );
};

describe("systemTheme", () => {
  afterEach(() => {
    document.body.className = "";
    localStorage.clear();
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
      localStorage.setItem(THEME_PREFERENCE_MIRROR_KEY, "sepia");
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      expect(getThemePreferenceInEffect()).toBe("system");
      expect(isLight()).toBe(true);
    });

    it("applies a stored pin on init, ignoring the device scheme", () => {
      localStorage.setItem(THEME_PREFERENCE_MIRROR_KEY, "dark");
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      expect(isDark()).toBe(true);
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

    it("reports whether a valid mirror was found", () => {
      mockMatchMedia({ prefersDark: false });
      expect(initColorScheme()).toBe(false);

      localStorage.setItem(THEME_PREFERENCE_MIRROR_KEY, "sepia");
      expect(initColorScheme()).toBe(false);

      localStorage.setItem(THEME_PREFERENCE_MIRROR_KEY, "system");
      expect(initColorScheme()).toBe(true);
    });

    it("drops the mirror when writing it fails", () => {
      mockMatchMedia({ prefersDark: false });
      const realStorage = window.localStorage;
      const removeItem = jest.fn();
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
          getItem: () => "light",
          setItem: () => {
            throw new Error("quota");
          },
          removeItem,
        },
      });
      try {
        initColorScheme();
        setThemePreference("dark");
      } finally {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          value: realStorage,
        });
      }

      expect(isDark()).toBe(true);
      expect(removeItem).toHaveBeenCalledWith(THEME_PREFERENCE_MIRROR_KEY);
    });

    it("mirrors the preference to localStorage", () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      setThemePreference("dark");
      expect(localStorage.getItem(THEME_PREFERENCE_MIRROR_KEY)).toBe("dark");
    });

    it("applies a change made in another extension page", () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      expect(isLight()).toBe(true);

      writeFromOtherPage("dark");
      expect(getThemePreferenceInEffect()).toBe("dark");
      expect(isDark()).toBe(true);
    });

    it("ignores a late event older than this page's own write", () => {
      mockMatchMedia({ prefersDark: false });
      initColorScheme();
      setThemePreference("light");

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: THEME_PREFERENCE_MIRROR_KEY,
          newValue: "dark",
        }),
      );
      expect(getThemePreferenceInEffect()).toBe("light");
      expect(isLight()).toBe(true);
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
