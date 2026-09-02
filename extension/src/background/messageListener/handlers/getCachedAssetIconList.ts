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
    // rather than stopping it being written, and it rules out ever storing a
    // meaningful null here.
    //
    // Retrying is the point: it is how an asset that got stuck gets its icon
    // back. But the retry is not free, and for an asset with no icon anywhere
    // it repeats forever without ever succeeding. Each attempt costs a
    // token-list scan and, when that finds nothing, one batched Horizon call
    // covering every such issuer plus a stellar.toml fetch for each issuer that
    // publishes a home domain. (USDT0 stops at the Horizon call: its issuer
    // publishes no home domain and, with its master key at weight 0, never
    // can.)
    //
    // That cost is newly paid by the flows that load balances with icons —
    // swap, send, manage assets, history — which previously skipped a
    // null-marked asset outright. The Account view's own icon hook already
    // retried regardless, since it passes an empty cache to its lookup pass, so
    // nothing changes there. And nothing suppresses the retry from one popup to
    // the next: closing the popup tears it down, taking Redux — the only record
    // of what this session already resolved — with it, so every open starts
    // from nothing.
    //
    // A negative cache that survives the popup, with a TTL so it expires rather
    // than latching, is the sane way to stop the endless retry — and this
    // filter would silently swallow one.
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
