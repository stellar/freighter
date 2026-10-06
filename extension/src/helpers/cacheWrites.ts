// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

/**
 * Cross-instance ordering for writes into the shared session caches.
 *
 * A per-hook `useRef` cannot order writes across a close/reopen: the old
 * instance's in-flight request keeps its own "I am the latest" bookkeeping, so
 * it still writes after the new instance's response has landed — and with a
 * fresh `updatedAt`, which serves the stale entry for a full validity window.
 * The map is module scope, so every instance in the popup shares one sequence
 * per cache key. The popup process is short-lived and keys are bounded by
 * (network, token, range), so entries are never evicted.
 */
let sequence = 0;
const latestByKey = new Map<string, number>();

/** Claims `key` for a request about to go out; pass the result to `canWriteCache`. */
export const beginCacheWrite = (key: string): number => {
  sequence += 1;
  latestByKey.set(key, sequence);
  return sequence;
};

/** Whether `claim` is still the newest request issued for `key`. */
export const canWriteCache = (key: string, claim: number): boolean =>
  latestByKey.get(key) === claim;

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Joins an in-flight request for `key` instead of starting a second one. The
 * warm queue and the user's own fetch can ask for the same range within one
 * round trip; without this both hit the backend (and its quota-metered
 * upstream) for an identical response.
 */
export const joinInFlight = <T>(
  key: string,
  start: () => Promise<T>,
): Promise<T> => {
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }
  const request = start().finally(() => {
    if (inFlight.get(key) === request) {
      inFlight.delete(key);
    }
  });
  inFlight.set(key, request);
  return request;
};

/** Settles once the request in flight for `key` does, if any; never rejects. */
export const awaitInFlight = async (key: string): Promise<void> => {
  await inFlight.get(key)?.catch(() => undefined);
};

/** Namespaced so the two caches cannot collide on a shared (network, token). */
export const priceHistoryCacheKey = ({
  networkPassphrase,
  token,
  range,
}: {
  networkPassphrase: string;
  token: string;
  range: string;
}) => `token-price-history:${networkPassphrase}/${token}/${range}`;

export const tokenStatsCacheKey = ({
  networkPassphrase,
  token,
}: {
  networkPassphrase: string;
  token: string;
}) => `token-stats:${networkPassphrase}/${token}`;

/** Test-only: the module state outlives a `render`, but not the popup. */
export const resetCacheWriteClaims = () => {
  sequence = 0;
  latestByKey.clear();
  inFlight.clear();
};
