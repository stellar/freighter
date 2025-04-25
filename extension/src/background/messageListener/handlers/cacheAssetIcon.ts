import { CacheAssetIconMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";

export const cacheAssetIcon = async ({
  request,
  localStore,
}: {
  request: CacheAssetIconMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetCanonical, iconUrl } = request;

  const assetIconCache =
    (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {};
  assetIconCache[assetCanonical] = iconUrl;
  await localStore.setItem(CACHED_ASSET_ICONS_ID, assetIconCache);
};
