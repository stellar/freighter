import { CacheAssetIconMessage } from "@shared/api/types/message-request";
import {
  boundAssetIconMap,
  toStorableIconUrl,
} from "background/helpers/assetIconCache";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";

const writeAssetIcon = async ({
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

  const icons: Record<string, unknown> = {
    ...((await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {}),
  };
  if (value === null) {
    if (!(assetCanonical in icons)) {
      return;
    }
    delete icons[assetCanonical];
    await localStore.setItem(CACHED_ASSET_ICONS_ID, boundAssetIconMap(icons));
    return;
  }

  if (icons[assetCanonical] === value) {
    return;
  }
  // Delete-then-set moves a re-cached canonical to the end; eviction is
  // oldest-written first (a hit does not refresh an entry's position).
  delete icons[assetCanonical];
  icons[assetCanonical] = value;
  await localStore.setItem(CACHED_ASSET_ICONS_ID, boundAssetIconMap(icons));
};

// Writes are serialised: the popup sends one message per asset without
// waiting, and concurrent read-modify-writes of the map would each read the
// same snapshot and keep only the last one.
let pendingWrite: Promise<unknown> = Promise.resolve();

export const cacheAssetIcon = (args: Parameters<typeof writeAssetIcon>[0]) => {
  const write = pendingWrite.then(() => writeAssetIcon(args));
  pendingWrite = write.catch(() => undefined);
  return write;
};
