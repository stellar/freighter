import { RecentProtocolEntry } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { RECENT_PROTOCOLS } from "constants/localStorageTypes";

export const clearRecentProtocols = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ recentProtocols: RecentProtocolEntry[] }> => {
  await localStore.remove(RECENT_PROTOCOLS);
  return { recentProtocols: [] };
};
