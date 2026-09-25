import { AssetVisibility, CollectibleKey } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HIDDEN_COLLECTIBLES } from "constants/localStorageTypes";

/** `{ [networkName]: { [publicKey]: { [collectibleKey]: visibility } } }` */
export type HiddenCollectiblesStore = Record<
  string,
  Record<string, Record<CollectibleKey, AssetVisibility>>
>;

/**
 * Before 5.47.0 this was a single flat `{ [collectibleKey]: visibility }` map
 * shared by every account on every network, so hiding a collectible on one
 * account hid it everywhere. A user whose storage version is missing or ahead
 * skips the migration, so readers have to recognise the old shape rather than
 * trust it.
 *
 * Mirrors `get-hidden-assets.ts`, which fixed the same bug for tokens in
 * 5.46.0.
 */
const isLegacyFlatMap = (store: Record<string, unknown>) =>
  Object.values(store).some((value) => typeof value === "string");

export const getHiddenCollectiblesStore = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<HiddenCollectiblesStore> => {
  const store = (await localStore.getItem(HIDDEN_COLLECTIBLES)) || {};
  return isLegacyFlatMap(store) ? {} : (store as HiddenCollectiblesStore);
};

/** The visibility map for one account on one network. */
export const getHiddenCollectibles = async ({
  localStore,
  publicKey,
  networkName,
}: {
  localStore: DataStorageAccess;
  publicKey: string;
  networkName: string;
}) => {
  const store = await getHiddenCollectiblesStore({ localStore });
  const hiddenCollectibles = store[networkName]?.[publicKey] || {};

  return { hiddenCollectibles };
};
