import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HAS_SEEN_DISCOVER_WELCOME } from "constants/localStorageTypes";

export const dismissDiscoverWelcome = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ hasSeenDiscoverWelcome: boolean }> => {
  await localStore.setItem(HAS_SEEN_DISCOVER_WELCOME, true);
  return { hasSeenDiscoverWelcome: true };
};
