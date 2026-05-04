import { AddRecentProtocolMessage } from "@shared/api/types/message-request";
import { RecentProtocolEntry } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { RECENT_PROTOCOLS } from "constants/localStorageTypes";

const MAX_RECENT = 5;

export const addRecentProtocol = async ({
  request,
  localStore,
}: {
  request: AddRecentProtocolMessage;
  localStore: DataStorageAccess;
}): Promise<{ recentProtocols: RecentProtocolEntry[] }> => {
  const { websiteUrl } = request;
  const existing =
    ((await localStore.getItem(RECENT_PROTOCOLS)) as
      | RecentProtocolEntry[]
      | undefined) || [];
  const filtered = existing.filter((entry) => entry.websiteUrl !== websiteUrl);
  const updated = [{ websiteUrl, lastAccessed: Date.now() }, ...filtered].slice(
    0,
    MAX_RECENT,
  );
  await localStore.setItem(RECENT_PROTOCOLS, updated);
  return { recentProtocols: updated };
};
