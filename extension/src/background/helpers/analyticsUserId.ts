import { Store } from "redux";
import { captureException } from "@sentry/browser";

import { callBackendV2 } from "background/helpers/callBackendV2";
import {
  getCachedCanonicalUserId,
  setCachedCanonicalUserId,
  userIdOf,
} from "background/helpers/canonical-user-id";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getLinkStatusEpoch } from "background/helpers/link-status";
import { getPinnedSourceId } from "background/helpers/secret-sources";
import { getSigningIdentity } from "background/helpers/signing-identity";

export interface AnalyticsUserId {
  analyticsUserId: string | null;
  /**
   * True when the id is the server's canonical id. False when it is the
   * pinned source id standing in until the first link, or null.
   */
  isConfirmed: boolean;
}

/**
 * The analytics user id: the canonical source id GET /api/v1/user returns
 * for the wallet's cluster (#69).
 *
 * - Cached: return it. No derivation, no request, and it works while locked.
 * - Unlocked, not cached: ask the server and cache a 200. Until the source
 *   is linked (404) or while the server can't be reached, return the pinned
 *   source id, unconfirmed and uncached, so the caller asks again later.
 * - Unlocked, but the signer is a fallback source and not the pin: skip the
 *   request and return the pin (null if none is stored), unconfirmed and
 *   uncached.
 * - Wallet replaced during the cache read or the request: null. Both ids
 *   are the old wallet's.
 * - Locked or hardware-only with nothing cached: null.
 *
 * Never returns or exposes the private keypair.
 */
export const getAnalyticsUserId = async (
  sessionStore: Store,
  localStore: DataStorageAccess,
): Promise<AnalyticsUserId> => {
  const epoch = getLinkStatusEpoch();
  const cached = await getCachedCanonicalUserId({ localStore });
  // A wallet replaced during the read: a cached id is the old wallet's.
  if (epoch !== getLinkStatusEpoch()) {
    return { analyticsUserId: null, isConfirmed: false };
  }
  if (cached) {
    return { analyticsUserId: cached, isConfirmed: true };
  }

  const identity = await getSigningIdentity({ sessionStore, localStore });
  if (!identity) {
    return { analyticsUserId: null, isConfirmed: false };
  }
  // Ask only as the pin. getSigningIdentity falls back to another held
  // source when the pinned one did not derive this unlock, and a 200 signed
  // by that source is its user, which may not be this wallet's. Caching it
  // would be permanent. No pin here means getSigningIdentity's pin write
  // failed. Either way, skip the request; the next load asks again.
  const pinned = await getPinnedSourceId({ localStore });
  if (pinned !== identity.sourceId) {
    // A wallet replaced during the pin read: the pin is the old wallet's.
    if (epoch !== getLinkStatusEpoch()) {
      return { analyticsUserId: null, isConfirmed: false };
    }
    return { analyticsUserId: pinned, isConfirmed: false };
  }

  try {
    const { status, body } = await callBackendV2({
      method: "GET",
      path: "/user",
      sessionStore,
      localStore,
    });
    const userId = status === 200 ? userIdOf(body) : null;
    if (userId) {
      const stored = await setCachedCanonicalUserId({
        localStore,
        userId,
        epoch,
      });
      // A wallet replaced mid-request: this id is the old wallet's.
      if (stored) {
        return { analyticsUserId: userId, isConfirmed: true };
      }
    } else if (status !== 404) {
      captureException(`getAnalyticsUserId: /user returned ${status}`);
    }
  } catch {
    // Offline, most likely. Not captured: the popup asks again on every
    // load until the id is confirmed, so this would fire on each one.
  }

  // A wallet replaced mid-request: the pinned source is the old wallet's.
  if (epoch !== getLinkStatusEpoch()) {
    return { analyticsUserId: null, isConfirmed: false };
  }
  return { analyticsUserId: identity.sourceId, isConfirmed: false };
};
