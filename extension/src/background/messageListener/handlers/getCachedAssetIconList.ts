import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { CACHED_ASSET_ICONS_ID } from "constants/localStorageTypes";

export const getCachedAssetIconList = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  const assetIconCache =
    (await localStore.getItem(CACHED_ASSET_ICONS_ID)) || {};

  return {
    // A null entry records that a lookup came up empty, and getAssetIcons reads
    // one as "already tried, don't look again". That was only ever meant to
    // last a session, but this cache is on disk, so the verdict outlived it: an
    // asset whose icon failed once stayed iconless for good, with no way back —
    // no icon means no <img>, so nothing fires the error handler that would
    // have retried. Leaving nulls out makes them ordinary cache misses, and the
    // fresh lookup overwrites the stale entry.
    icons: Object.fromEntries(
      Object.entries(assetIconCache).filter(([, iconUrl]) => iconUrl),
    ),
  };
};
