import { Store } from "redux";

import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getSigningIdentity } from "background/helpers/signing-identity";

/**
 * The analytics user id: the pinned source id, the same identity that signs
 * every backend request. Null when the session holds no signer. Never returns
 * or exposes the private keypair.
 */
export const getAnalyticsUserId = async (
  sessionStore: Store,
  localStore: DataStorageAccess,
): Promise<string | null> =>
  (await getSigningIdentity({ sessionStore, localStore }))?.sourceId ?? null;
