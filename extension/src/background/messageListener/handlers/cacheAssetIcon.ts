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

  if (iconUrl) {
    assetIconCache[assetCanonical] = iconUrl;
  } else {
    // A falsy iconUrl means "forget what we cached" (retryAssetIcon sends null
    // to drop a url that failed to load). Delete the entry rather than storing
    // the null: getAssetIcons treats a cached null as "already tried, never
    // look again", and this cache is persisted to disk — so a single transient
    // image failure would blacklist the asset's icon for good.
    delete assetIconCache[assetCanonical];
  }

  await localStore.setItem(CACHED_ASSET_ICONS_ID, assetIconCache);
};
