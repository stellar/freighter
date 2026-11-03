import {
  DARK_SCHEME_QUERY,
  followSystemColorScheme,
  getAppliedColorScheme,
  getSystemColorScheme,
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

describe("systemTheme", () => {
  afterEach(() => {
    document.body.className = "";
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

  describe("followSystemColorScheme", () => {
    it("replaces the static light class with the device scheme", () => {
      document.body.className = "sds-theme-light";
      mockMatchMedia({ prefersDark: true });

      followSystemColorScheme();

      expect(document.body.classList.contains("sds-theme-dark")).toBe(true);
      expect(document.body.classList.contains("sds-theme-light")).toBe(false);
    });

    it("follows live system-theme changes while the popup is open", () => {
      document.body.className = "sds-theme-light";
      const { emitChange } = mockMatchMedia({ prefersDark: false });

      followSystemColorScheme();
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

      followSystemColorScheme();

      expect(document.body.classList.contains("some-other-class")).toBe(true);
    });
  });

  describe("getAppliedColorScheme", () => {
    it("reports the class actually on the body, not the media query", () => {
      // The applied class is the source of truth: #38's manual override will
      // set the class without the media query changing.
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
