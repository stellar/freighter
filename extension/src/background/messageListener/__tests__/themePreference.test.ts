import { SERVICE_TYPES } from "@shared/constants/services";
import { THEME_PREFERENCE_ID } from "constants/localStorageTypes";
import { getThemePreference } from "../handlers/getThemePreference";
import { saveThemePreference } from "../handlers/saveThemePreference";

const makeStore = (stored: unknown) =>
  ({
    getItem: jest.fn().mockResolvedValue(stored),
    setItem: jest.fn().mockResolvedValue(undefined),
  }) as any;

describe("getThemePreference", () => {
  it("defaults to system when nothing is stored", async () => {
    const result = await getThemePreference({ localStore: makeStore(null) });
    expect(result.themePreference).toBe("system");
  });

  it("returns a stored pin", async () => {
    const result = await getThemePreference({ localStore: makeStore("dark") });
    expect(result.themePreference).toBe("dark");
  });

  it("coerces a malformed stored value to system", async () => {
    const result = await getThemePreference({ localStore: makeStore(42) });
    expect(result.themePreference).toBe("system");
  });
});

describe("saveThemePreference", () => {
  it("stores a valid preference", async () => {
    const localStore = makeStore(null);
    const result = await saveThemePreference({
      request: {
        activePublicKey: "",
        type: SERVICE_TYPES.SAVE_THEME_PREFERENCE,
        themePreference: "light",
      },
      localStore,
    });
    expect(localStore.setItem).toHaveBeenCalledWith(
      THEME_PREFERENCE_ID,
      "light",
    );
    expect(result.themePreference).toBe("light");
  });

  it("stores system for a malformed request", async () => {
    const localStore = makeStore(null);
    await saveThemePreference({
      request: {
        activePublicKey: "",
        type: SERVICE_TYPES.SAVE_THEME_PREFERENCE,
        themePreference: "sepia" as any,
      },
      localStore,
    });
    expect(localStore.setItem).toHaveBeenCalledWith(
      THEME_PREFERENCE_ID,
      "system",
    );
  });
});
