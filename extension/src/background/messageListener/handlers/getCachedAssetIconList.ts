import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";

export const getCachedAssetIconList = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => ({
  icons: (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {},
});
