import { AssetKey, AssetVisibility } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
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
const isLegacyFlatMap = (store: Record<string, unknown>) =>
  Object.values(store).some((value) => typeof value === "string");

export const getHiddenAssetsStore = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<HiddenAssetsStore> => {
  const store = (await localStore.getItem(HIDDEN_ASSETS)) || {};
  return isLegacyFlatMap(store) ? {} : (store as HiddenAssetsStore);
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
