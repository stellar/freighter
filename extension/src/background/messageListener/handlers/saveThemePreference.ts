import { SaveThemePreferenceMessage } from "@shared/api/types/message-request";
import {
  coerceThemePreference,
  ThemePreference,
} from "@shared/constants/theme";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { THEME_PREFERENCE_ID } from "constants/localStorageTypes";

export const saveThemePreference = async ({
  request,
  localStore,
}: {
  request: SaveThemePreferenceMessage;
  localStore: DataStorageAccess;
}): Promise<{ themePreference: ThemePreference }> => {
  const themePreference = coerceThemePreference(request.themePreference);
  await localStore.setItem(THEME_PREFERENCE_ID, themePreference);
  return { themePreference };
};
