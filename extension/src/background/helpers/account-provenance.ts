import {
  AccountProvenance,
  AccountProvenanceMap,
  AccountType,
} from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { ACCOUNT_PROVENANCE_ID } from "constants/localStorageTypes";

/*
  Each account's provenance (its `AccountType` and the `SecretSource` it is
  rooted in), keyed by keystore id and persisted in PLAIN local storage beside
  `accountNameList`. Nothing here is secret: under v2 an account's identity
  does not depend on whether it was derived or imported, and the grouping it
  serves (accounts under their phrase) is visible in the UI anyway.

  Plain storage is what lets a locked wallet list every account's type and
  source, and what lets the install-time migration (#76) backfill it with no
  password. An id with no entry is "not yet attributed": a pre-V2 account the
  migration has not reached.

  Keep this module free of imports from `background/helpers/account`: several
  suites replace that module with partial mocks.
*/

const getMap = async (localStore: DataStorageAccess) =>
  ((await localStore.getItem(ACCOUNT_PROVENANCE_ID)) as AccountProvenanceMap) ||
  {};

export const getAccountProvenance = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<AccountProvenanceMap> => getMap(localStore);

/** Writes (or replaces) the entry for `keyId`. */
export const setAccountProvenance = async ({
  localStore,
  keyId,
  type,
  sourceId,
}: {
  localStore: DataStorageAccess;
  keyId: string;
  type: AccountType;
  sourceId?: string;
}) => {
  const entry: AccountProvenance = sourceId ? { type, sourceId } : { type };

  await localStore.setItem(ACCOUNT_PROVENANCE_ID, {
    ...(await getMap(localStore)),
    [keyId]: entry,
  });
};

/** Drops the entry for `keyId`. A no-op when there is none. */
export const removeAccountProvenance = async ({
  localStore,
  keyId,
}: {
  localStore: DataStorageAccess;
  keyId: string;
}) => {
  const map = await getMap(localStore);

  if (!(keyId in map)) {
    return;
  }

  const { [keyId]: _removed, ...rest } = map;
  await localStore.setItem(ACCOUNT_PROVENANCE_ID, rest);
};

export const clearAccountProvenance = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  await localStore.remove(ACCOUNT_PROVENANCE_ID);
};
