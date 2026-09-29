import { AssetVisibility, CollectibleKey } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getVisibilityNetworkNames,
  isLegacyFlatVisibilityMap,
  nestLegacyVisibilityMap,
} from "background/helpers/hidden-visibility";
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
export const getHiddenCollectiblesStore = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<HiddenCollectiblesStore> => {
  const store = (await localStore.getItem(HIDDEN_COLLECTIBLES)) || {};
  return isLegacyFlatVisibilityMap(store)
    ? {}
    : (store as HiddenCollectiblesStore);
};

/**
 * The same store, but with a legacy flat map converted in place rather than
 * discarded. See `resolveHiddenAssetsStore` for why writers cannot use the
 * reader above.
 */
export const resolveHiddenCollectiblesStore = async ({
  localStore,
  publicKey,
}: {
  localStore: DataStorageAccess;
  publicKey: string;
}): Promise<HiddenCollectiblesStore> => {
  const store = (await localStore.getItem(HIDDEN_COLLECTIBLES)) || {};

  if (!isLegacyFlatVisibilityMap(store)) {
    return store as HiddenCollectiblesStore;
  }

  const networkNames = await getVisibilityNetworkNames({ localStore });
  return nestLegacyVisibilityMap({
    legacyMap: store,
    publicKey,
    networkNames,
  }) as HiddenCollectiblesStore;
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
