import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getLinkStatusEpoch } from "background/helpers/link-status";
import { CANONICAL_USER_ID } from "constants/localStorageTypes";

/*
  The user id the server last returned for this wallet (#69): the cluster's
  canonical source id, its root. It is the analytics id. Persisted in PLAIN
  local storage so a locked wallet still attributes events: like a source id,
  it is a one-way hash and cannot be linked back to a G address.

  For a phrase wallet it equals the phrase's source id, the value already in
  `metrics_user_id`. It differs from the pinned source only when the wallet
  resolved to an existing user through a key, and only the server knows it
  then.

  It shares the link-status epoch. clearLinkStatus removes it with the link
  map whenever the wallet is replaced, and a response that started before
  the replacement is dropped.

  Only a 64-char lowercase hex id is accepted, the shape of every source id.
  Anything else (a proxy's 200, a server bug) reads as no id, so it is never
  cached and a bad value already stored is asked again.
*/

const isCanonicalUserId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

export const getCachedCanonicalUserId = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<string | null> => {
  const id = await localStore.getItem(CANONICAL_USER_ID);
  return isCanonicalUserId(id) ? id : null;
};

/**
 * Stores the server's user id, overwriting any earlier one. A no-op, and
 * false, when the wallet was replaced since `epoch` was read. Also false when
 * it was replaced during the write: the clear removes the id, and the caller
 * must not adopt it.
 */
export const setCachedCanonicalUserId = async ({
  localStore,
  userId,
  epoch,
}: {
  localStore: DataStorageAccess;
  userId: string;
  epoch: number;
}): Promise<boolean> => {
  if (epoch !== getLinkStatusEpoch()) {
    return false;
  }
  await localStore.setItem(CANONICAL_USER_ID, userId);
  return epoch === getLinkStatusEpoch();
};

/**
 * The `data.userId` of a /user or /user/link response, or null when it is
 * missing or not a 64-char lowercase hex id.
 */
export const userIdOf = (body: unknown): string | null => {
  const userId = (body as { data?: { userId?: unknown } } | null)?.data?.userId;
  return isCanonicalUserId(userId) ? userId : null;
};
