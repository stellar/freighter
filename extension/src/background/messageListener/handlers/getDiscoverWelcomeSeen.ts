import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HAS_SEEN_DISCOVER_WELCOME } from "constants/localStorageTypes";

export const getDiscoverWelcomeSeen = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ hasSeenDiscoverWelcome: boolean }> => {
  const seen = await localStore.getItem(HAS_SEEN_DISCOVER_WELCOME);
  return { hasSeenDiscoverWelcome: !!seen };
};
