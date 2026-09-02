/**
 * Asset icons come from sources we don't control — several curated token lists
 * plus the issuer's SEP-1 TOML — and any of them can carry a url that no longer
 * serves an image. Rather than trusting whichever source we happened to read
 * first, we load each candidate and keep the first one that actually renders.
 *
 * The probe is an <img> load, not a fetch: the extension declares no
 * host_permissions, so a cross-origin fetch to an arbitrary icon host is
 * CORS-gated, while an image load is not. That also means this only works in a
 * DOM context (the popup), which is the only place icon resolution runs.
 */

/**
 * Total time allowed to find a working icon for one asset, shared across all of
 * its candidates rather than granted per candidate — so the worst case stays
 * flat instead of scaling with how many lists happen to carry the asset.
 *
 * Measured against the real candidates for
 * USDT0:GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q, both ~8KB
 * pngs: 130-300ms each including cold DNS + TLS. 1.2s leaves several times that
 * headroom for a slow connection while staying well short of a visible stall.
 *
 * Running out of budget is cheap: the asset falls back to its generic icon for
 * this load only. Nothing negative is persisted (see cacheAssetIcon), and the
 * browser generally finishes the abandoned request into its own HTTP cache, so
 * the next attempt resolves immediately.
 */
export const ICON_LOAD_BUDGET_MS = 1200;

export type IconProbe = (url: string, timeoutMs: number) => Promise<boolean>;

export const canLoadIcon: IconProbe = (url, timeoutMs) =>
  new Promise((resolve) => {
    if (typeof Image === "undefined") {
      // No DOM to load an image with. Callers are popup-only today, so this is
      // a guard rather than a supported path.
      resolve(false);
      return;
    }

    const img = new Image();
    let timer: ReturnType<typeof setTimeout>;
    let settled = false;

    const finish = (didLoad: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      // Deliberately not clearing img.src on timeout: letting the request run
      // to completion populates the browser's HTTP cache, so a candidate that
      // was merely slow this time resolves instantly on the next attempt.
      resolve(didLoad);
    };

    timer = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });

/**
 * Returns the first candidate that loads, or undefined if none do before the
 * shared budget runs out. Candidates are tried in order, and probing stops as
 * soon as one succeeds.
 */
export const firstLoadableIconUrl = async (
  urls: string[],
  {
    budgetMs = ICON_LOAD_BUDGET_MS,
    probe = canLoadIcon,
  }: { budgetMs?: number; probe?: IconProbe } = {},
): Promise<string | undefined> => {
  const deadline = Date.now() + budgetMs;

  for (let index = 0; index < urls.length; index += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return undefined;
    }

    // Split what's left evenly across the candidates still to try, rather than
    // offering the whole remainder to the next one. A throttled host that never
    // answers would otherwise spend the entire budget and starve a healthy
    // candidate behind it — the very failure this is here to prevent. A
    // candidate that answers quickly leaves its unused share to the rest.
    const share = Math.ceil(remaining / (urls.length - index));

    if (await probe(urls[index], share)) {
      return urls[index];
    }
  }

  return undefined;
};

/**
 * How many assets resolve their icon at once.
 *
 * Icon resolution sits on the balances render path (useGetBalances awaits it
 * before dispatching), so resolving one asset at a time would add a real image
 * round-trip per asset to what used to be an in-memory scan. Running them
 * concurrently keeps the wall-clock cost close to a single asset's rather than
 * the sum, while the limit stops a large wallet from opening a connection per
 * held asset at once.
 */
/**
 * Ceiling on how long the whole token-list pass may spend, across every asset.
 *
 * ICON_LOOKUP_CONCURRENCY bounds how many assets resolve at once, not how long
 * the pass takes: a wallet holding more uncached assets than the limit resolves
 * them in waves, and each wave can spend the full per-asset budget. Since
 * getAssetIcons is awaited before the balances render, enough waves against a
 * dead host would hold the balances behind a visibly long wait.
 *
 * Assets not reached in time simply fall through to the issuer-toml stage,
 * which runs in one parallel batch rather than in waves, and are looked up
 * again on the next load.
 */
export const ICON_LOOKUP_TOTAL_BUDGET_MS = 4000;

export const ICON_LOOKUP_CONCURRENCY = 8;

/**
 * Promise.all with a ceiling on how many run at once. Results come back in
 * input order regardless of which finished first.
 */
export const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;

  const runWorker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runWorker),
  );

  return results;
};
