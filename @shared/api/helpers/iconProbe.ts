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

  for (const url of urls) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return undefined;
    }
    if (await probe(url, remaining)) {
      return url;
    }
  }

  return undefined;
};
