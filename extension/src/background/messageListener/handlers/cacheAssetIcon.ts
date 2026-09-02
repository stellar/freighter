import { CacheAssetIconMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";

/**
 * Serializes the icon cache's read-modify-write.
 *
 * The whole cache lives under one storage key, and every update reads it,
 * changes one entry, and writes it back. Icon resolution runs several lookups
 * concurrently, so these messages arrive overlapping — and storage hands each
 * handler its own deserialized copy, so without a queue two handlers read the
 * same map, add different assets, and the later write discards the earlier
 * one's icon (or undoes a clear). Chaining keeps each update working from the
 * result of the last.
 *
 * A failed update still lets the queue continue: the rejection is passed to
 * whoever asked for that write, not to the writes behind it.
 */
let pendingCacheWrite: Promise<void> = Promise.resolve();

export const cacheAssetIcon = async ({
  request,
  localStore,
}: {
  request: CacheAssetIconMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetCanonical, iconUrl } = request;

  const applyUpdate = async () => {
    const assetIconCache =
      (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {};

    if (iconUrl) {
      assetIconCache[assetCanonical] = iconUrl;
    } else {
      // A falsy iconUrl means "forget what we cached" (retryAssetIcon sends
      // null to drop a url that failed to load). Delete the entry rather than
      // storing the null: getAssetIcons treats a cached null as "already
      // tried, never look again", and this cache is persisted to disk — so a
      // single transient image failure would blacklist the asset's icon for
      // good.
      delete assetIconCache[assetCanonical];
    }

    await localStore.setItem(CACHED_ASSET_ICONS_ID, assetIconCache);
  };

  pendingCacheWrite = pendingCacheWrite.then(applyUpdate, applyUpdate);
  return pendingCacheWrite;
};
