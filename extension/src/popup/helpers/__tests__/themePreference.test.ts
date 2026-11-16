import * as internal from "@shared/api/internal";
import * as metrics from "helpers/metrics";
import {
  getThemePreferenceInEffect,
  initColorScheme,
  setThemePreference,
} from "popup/helpers/systemTheme";
import {
  changeThemePreference,
  syncThemePreferenceFromStorage,
} from "popup/helpers/themePreference";

jest.mock("@shared/api/internal", () => ({
  getThemePreference: jest.fn(),
  saveThemePreference: jest.fn(),
}));
jest.mock("helpers/metrics", () => ({ syncPreferredThemeTrait: jest.fn() }));

const mockedInternal = internal as jest.Mocked<typeof internal>;
const mockedMetrics = metrics as jest.Mocked<typeof metrics>;

describe("themePreference", () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
    }));
    localStorage.clear();
    initColorScheme();
  });

  afterEach(() => {
    jest.resetAllMocks();
    document.body.className = "";
  });

  it("adopts the chrome.storage value when the mirror is missing", async () => {
    mockedInternal.getThemePreference.mockResolvedValue("dark");
    await syncThemePreferenceFromStorage();
    expect(getThemePreferenceInEffect()).toBe("dark");
    expect(document.body.classList.contains("sds-theme-dark")).toBe(true);
  });

  it("updates preferred_theme only when the stored value is applied", async () => {
    mockedInternal.getThemePreference.mockResolvedValue("dark");
    await syncThemePreferenceFromStorage();
    expect(mockedMetrics.syncPreferredThemeTrait).toHaveBeenCalledWith("dark");

    mockedMetrics.syncPreferredThemeTrait.mockClear();
    await syncThemePreferenceFromStorage();
    expect(mockedMetrics.syncPreferredThemeTrait).not.toHaveBeenCalled();
  });

  it("ignores a stored value read before a newer change", async () => {
    let reply: (value: "light") => void = () => {};
    mockedInternal.getThemePreference.mockReturnValue(
      new Promise((resolve) => {
        reply = resolve;
      }),
    );
    const sync = syncThemePreferenceFromStorage();

    setThemePreference("dark");
    reply("light");
    await sync;

    expect(getThemePreferenceInEffect()).toBe("dark");
    expect(mockedMetrics.syncPreferredThemeTrait).not.toHaveBeenCalled();
  });

  it("keeps the mirrored theme when the background is unreachable", async () => {
    mockedInternal.getThemePreference.mockRejectedValue(new Error("no bg"));
    await syncThemePreferenceFromStorage();
    expect(getThemePreferenceInEffect()).toBe("system");
  });

  it("applies before persisting, then saves to chrome.storage", async () => {
    let appliedAtSave: string | undefined;
    mockedInternal.saveThemePreference.mockImplementation(async (p) => {
      appliedAtSave = getThemePreferenceInEffect();
      return p;
    });
    await changeThemePreference("dark");
    expect(appliedAtSave).toBe("dark");
    expect(mockedInternal.saveThemePreference).toHaveBeenCalledWith("dark");
  });
});
