import { CacheAssetIconMessage } from "@shared/api/types/message-request";
import {
  MAX_CACHED_ASSET_ICONS,
  readAssetIconCache,
  toStorableIconUrl,
} from "background/helpers/assetIconCache";
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

  // null clears the entry (see retryAssetIcon); anything else must be an
  // https url, or it is dropped without a write.
  const value = iconUrl === null ? null : toStorableIconUrl(iconUrl);
  if (iconUrl !== null && value === null) {
    return;
  }

  const icons = await readAssetIconCache(localStore);
  if (value === null) {
    if (!(assetCanonical in icons)) {
      return;
    }
    delete icons[assetCanonical];
  } else {
    if (icons[assetCanonical] === value) {
      return;
    }
    // Delete-then-set moves a re-cached canonical to the end; eviction is
    // oldest-written first (a hit does not refresh an entry's position).
    delete icons[assetCanonical];
    icons[assetCanonical] = value;
    const keys = Object.keys(icons);
    for (let i = 0; i < keys.length - MAX_CACHED_ASSET_ICONS; i += 1) {
      delete icons[keys[i]];
    }
  }

  await localStore.setItem(CACHED_ASSET_ICONS_ID, icons);
};
