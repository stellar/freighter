import { AssetKey, AssetVisibility } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getVisibilityNetworkNames,
  isLegacyFlatVisibilityMap,
  nestLegacyVisibilityMap,
} from "background/helpers/hidden-visibility";
import { HIDDEN_ASSETS } from "constants/localStorageTypes";

/** `{ [networkName]: { [publicKey]: { [assetKey]: visibility } } }` */
export type HiddenAssetsStore = Record<
  string,
  Record<string, Record<AssetKey, AssetVisibility>>
>;

/**
 * Before 5.46.0 this was a single flat `{ [assetKey]: visibility }` map shared
 * by every account on every network, so hiding an asset on one account hid it
 * everywhere. A user whose storage version is missing or ahead skips the
 * migration, so readers have to recognise the old shape rather than trust it.
 */
export const getHiddenAssetsStore = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<HiddenAssetsStore> => {
  const store = (await localStore.getItem(HIDDEN_ASSETS)) || {};
  return isLegacyFlatVisibilityMap(store) ? {} : (store as HiddenAssetsStore);
};

/**
 * The same store, but with a legacy flat map converted in place rather than
 * discarded. Writers must use this: spreading the empty store `getHiddenAssetsStore`
 * returns would write the new shape straight over the old map, and the result
 * has no string leaves -- so the migration would then treat it as already
 * migrated and every earlier hide would be gone for good.
 */
export const resolveHiddenAssetsStore = async ({
  localStore,
  publicKey,
}: {
  localStore: DataStorageAccess;
  publicKey: string;
}): Promise<HiddenAssetsStore> => {
  const store = (await localStore.getItem(HIDDEN_ASSETS)) || {};

  if (!isLegacyFlatVisibilityMap(store)) {
    return store as HiddenAssetsStore;
  }

  const networkNames = await getVisibilityNetworkNames({ localStore });
  return nestLegacyVisibilityMap({
    legacyMap: store,
    publicKey,
    networkNames,
  }) as HiddenAssetsStore;
};

/** The visibility map for one account on one network. */
export const getHiddenAssets = async ({
  localStore,
  publicKey,
  networkName,
}: {
  localStore: DataStorageAccess;
  publicKey: string;
  networkName: string;
}) => {
  const store = await getHiddenAssetsStore({ localStore });
  const hiddenAssets = store[networkName]?.[publicKey] || {};

  return { hiddenAssets };
};
