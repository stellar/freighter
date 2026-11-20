import { SERVICE_TYPES } from "@shared/constants/services";
import { THEME_PREFERENCE_ID } from "constants/localStorageTypes";
import { saveThemePreference } from "../handlers/saveThemePreference";

const makeStore = () =>
  ({
    setItem: jest.fn().mockResolvedValue(undefined),
  }) as any;

describe("saveThemePreference", () => {
  it("stores a valid preference", async () => {
    const localStore = makeStore();
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
    const localStore = makeStore();
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
