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
    // one as "already tried, don't look again". That was only ever meant to last
    // a session, but this cache is on disk, so the verdict outlived it: an asset
    // whose icon failed once stayed iconless for good, with no way back — no
    // icon means no <img>, so nothing fires the error handler that would have
    // retried. Dropping nulls here turns them back into ordinary cache misses,
    // and the fresh lookup overwrites the stale entry.
    //
    // TODO: this is a read-side workaround, not the real fix. It hides bad data
    // rather than stopping it being written, and it permanently rules out ever
    // storing a legitimate null here — which we may well want, since an asset
    // with genuinely no icon currently re-runs the whole lookup chain (token
    // lists, then Horizon, then the issuer's stellar.toml) on every cold popup
    // open. A durable negative cache with a TTL is the sane answer to that, and
    // this filter would silently swallow it.
    //
    // To fix properly, in order:
    //   1. Stop persisting nulls: retryAssetIcon sends `iconUrl: null` meaning
    //      "clear this", so cacheAssetIcon should delete the entry rather than
    //      store the null.
    //   2. Add a migration to clear the nulls already on disk. It cannot be
    //      done by (1) alone, since nothing rewrites an entry the lookup skips.
    //   3. Drop this filter, so the read path goes back to being a plain
    //      accessor and null is free to mean something again.
    // Doing (2) without (1) is not enough on its own: every later icon failure
    // writes a fresh null and puts that user straight back into the bug.
    icons: Object.fromEntries(
      Object.entries(assetIconCache).filter(([, iconUrl]) => iconUrl),
    ),
  };
};
