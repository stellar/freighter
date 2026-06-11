import { RecentProtocolEntry } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { RECENT_PROTOCOLS } from "constants/localStorageTypes";

export const getRecentProtocols = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ recentProtocols: RecentProtocolEntry[] }> => {
  const stored = (await localStore.getItem(RECENT_PROTOCOLS)) as
    | RecentProtocolEntry[]
    | undefined;
  return { recentProtocols: stored || [] };
};
