import { readAssetIconCache } from "background/helpers/assetIconCache";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const getCachedAssetIconList = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => ({
  // Only https urls come back: a null that an older build stored for a
  // failed lookup is dropped on read, so the asset is looked up again.
  icons: await readAssetIconCache(localStore),
});
