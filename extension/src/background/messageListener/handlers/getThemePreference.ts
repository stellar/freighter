import {
  coerceThemePreference,
  ThemePreference,
} from "@shared/constants/theme";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { THEME_PREFERENCE_ID } from "constants/localStorageTypes";

export const getThemePreference = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ themePreference: ThemePreference }> => ({
  themePreference: coerceThemePreference(
    await localStore.getItem(THEME_PREFERENCE_ID),
  ),
});
