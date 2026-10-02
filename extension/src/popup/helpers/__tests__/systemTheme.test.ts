import {
  LIGHT_SCHEME_QUERY,
  followSystemColorScheme,
  getAppliedColorScheme,
  getSystemColorScheme,
} from "popup/helpers/systemTheme";

type ChangeHandler = (e: { matches: boolean }) => void;

// `matches` is for the explicit-light query the module uses.
const mockMatchMedia = ({ prefersLight }: { prefersLight: boolean }) => {
  const listeners: ChangeHandler[] = [];
  const mql = {
    matches: prefersLight,
    media: LIGHT_SCHEME_QUERY,
    addEventListener: (_: string, handler: ChangeHandler) => {
      listeners.push(handler);
    },
    removeEventListener: jest.fn(),
  };
  window.matchMedia = jest.fn().mockImplementation(() => mql);
  return {
    emitChange: ({ prefersLight: next }: { prefersLight: boolean }) => {
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
    it("is light only on an explicit light preference", () => {
      mockMatchMedia({ prefersLight: true });
      expect(getSystemColorScheme()).toBe("light");
    });

    it("is dark when the device prefers dark", () => {
      mockMatchMedia({ prefersLight: false });
      expect(getSystemColorScheme()).toBe("dark");
    });

    it("falls back to dark when matchMedia is unavailable", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).matchMedia = undefined;
      expect(getSystemColorScheme()).toBe("dark");
    });

    it("falls back to dark when the query is unsupported (matches false)", () => {
      // An unparsed query reports matches=false — not an explicit light
      // preference, so it must resolve dark like the index.html fallback.
      window.matchMedia = jest.fn().mockImplementation(() => ({
        matches: false,
        media: "not all",
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));
      expect(getSystemColorScheme()).toBe("dark");
    });
  });

  describe("followSystemColorScheme", () => {
    it("replaces the static dark class with the device scheme", () => {
      document.body.className = "sds-theme-dark";
      mockMatchMedia({ prefersLight: true });

      followSystemColorScheme();

      expect(document.body.classList.contains("sds-theme-light")).toBe(true);
      expect(document.body.classList.contains("sds-theme-dark")).toBe(false);
    });

    it("follows live system-theme changes while the popup is open", () => {
      document.body.className = "sds-theme-dark";
      const { emitChange } = mockMatchMedia({ prefersLight: false });

      followSystemColorScheme();
      expect(document.body.classList.contains("sds-theme-dark")).toBe(true);

      emitChange({ prefersLight: true });
      expect(document.body.classList.contains("sds-theme-light")).toBe(true);
      expect(document.body.classList.contains("sds-theme-dark")).toBe(false);

      emitChange({ prefersLight: false });
      expect(document.body.classList.contains("sds-theme-dark")).toBe(true);
      expect(document.body.classList.contains("sds-theme-light")).toBe(false);
    });

    it("keeps unrelated body classes intact", () => {
      document.body.className = "sds-theme-dark some-other-class";
      mockMatchMedia({ prefersLight: true });

      followSystemColorScheme();

      expect(document.body.classList.contains("some-other-class")).toBe(true);
    });
  });

  describe("getAppliedColorScheme", () => {
    it("reports the class actually on the body, not the media query", () => {
      // The applied class is the source of truth: #38's manual override will
      // set the class without the media query changing.
      mockMatchMedia({ prefersLight: false });
      document.body.className = "sds-theme-light";
      expect(getAppliedColorScheme()).toBe("light");
    });

    it("defaults to dark when no theme class is present", () => {
      document.body.className = "";
      expect(getAppliedColorScheme()).toBe("dark");
    });
  });
});
