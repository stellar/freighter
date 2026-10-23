import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { LINK_STATUS_ID } from "constants/localStorageTypes";

/*
  What the server last said about each source, keyed by source id and
  persisted in PLAIN local storage (#68). A source id is a one-way hash, not a
  key, and the status carries no secret.

  "linked": the server listed the source in the caller's cluster.
  "conflict": the source belongs to another user. It stays there (v2
  "Resolution"), so sending it again only gets the same answer back.

  A source with no entry has not been confirmed yet. The linker sends every
  such source on the next trigger, which is the retry for an offline first
  run. An entry is written only after a successful response, never by the
  install-time migration. Removing an account removes no source, so nothing
  here is cleared on removal.

  Replacing the wallet (create over, recover) clears the map and moves the
  epoch. A pass that started before the clear may still get a response
  afterwards; recordLinkResults drops it, so the replaced wallet's answers
  never land in the new wallet's map.
*/

export type LinkStatus = "linked" | "conflict";
type LinkStatusMap = Record<string, LinkStatus>;

const getMap = async (localStore: DataStorageAccess) =>
  ((await localStore.getItem(LINK_STATUS_ID)) as LinkStatusMap) || {};

let epoch = 0;

/** Read before a pass starts; pass the value to recordLinkResults. */
export const getLinkStatusEpoch = () => epoch;

export const getLinkStatus = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<LinkStatusMap> => getMap(localStore);

/** The source ids the server reported as belonging to another user. */
export const getLinkConflicts = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<string[]> =>
  Object.entries(await getMap(localStore))
    .filter(([, status]) => status === "conflict")
    .map(([id]) => id);

/**
 * Merges one response into the stored map. Entries from earlier calls are
 * kept. A no-op when both lists are empty, or when the map was cleared since
 * `epoch` was read. Returns false only in that last case.
 */
export const recordLinkResults = async ({
  localStore,
  linked,
  conflicts,
  epoch: readAt,
}: {
  localStore: DataStorageAccess;
  linked: string[];
  conflicts: string[];
  epoch: number;
}): Promise<boolean> => {
  if (readAt !== epoch) {
    return false;
  }
  if (!linked.length && !conflicts.length) {
    return true;
  }
  const map = await getMap(localStore);
  // The read above awaited; a clear may have landed during it.
  if (readAt !== epoch) {
    return false;
  }
  for (const id of linked) {
    map[id] = "linked";
  }
  for (const id of conflicts) {
    map[id] = "conflict";
  }
  await localStore.setItem(LINK_STATUS_ID, map);
  return true;
};

/** For a recover, which replaces every source the wallet holds. */
export const clearLinkStatus = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  epoch += 1;
  await localStore.remove(LINK_STATUS_ID);
};
