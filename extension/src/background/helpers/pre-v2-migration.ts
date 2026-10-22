import { AccountType } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  getAccountProvenance,
  setAccountProvenance,
} from "background/helpers/account-provenance";
import {
  ACCOUNT_NAME_LIST_ID,
  KEY_ID,
  KEY_ID_LIST,
  PENDING_ATTRIBUTION_ID,
} from "constants/localStorageTypes";
import { decodeString, encodeObject } from "helpers/urls";

/*
  Pre-V2 -> multi-source storage migration (#76), install-time half.

  A pre-V2 install holds one phrase stamped into every keystore's `extra`, the
  global `keyDerivationNumber` counter, and none of `secretSources`,
  `pinnedSourceId`, `derivationIndices` or `accountProvenance`. Every one of
  its accounts must open on the multi-source model with nothing re-onboarded.

  The migration runs in two passes:

  1. INSTALL PASS (this file, `migratePreV2Storage`). It runs from
     `onInstalled` via `versionedMigration`, with no password, and is never
     deferred. It reads plain storage only. It repairs the legacy `keyId` and
     `keyIdList` shapes, writes `{ type: HW }` provenance for hardware
     accounts, and records every other unattributed account in
     `pendingAttribution`. It cannot do more: the phrase, the private keys and
     `extra.imported` are inside the encrypted keystores.

  2. UNLOCK PASS (`messageListener/helpers/attribute-pending-accounts.ts`).
     It runs inside `loginToAllAccounts` while the password is in hand, and
     resolves the pending list: it creates "Seed Phrase 1" from the wallet
     phrase, pins it, seeds its index set from `keyDerivationNumber`, and
     attributes each keystore to its phrase or to its own "Secret Key N".
     It is idempotent. No later migration waits on it.

  ROLLBACK POSTURE. This migration only adds keys (`accountProvenance`,
  `pendingAttribution`, and at unlock `secretSources`, `pinnedSourceId` and
  `derivationIndices`). It never deletes a key and never rewrites a keystore.
  `keyDerivationNumber` is deliberately kept: a downgraded build derives its
  next account from it. The only in-place writes are the two legacy repairs
  below, which restore the shape the old code itself expects (a string
  `keyId`, a populated `keyIdList`). A downgraded build therefore reads the
  same keystores, ids, names and counter it wrote, and ignores the new keys.
  Accounts it adds carry no provenance and the storage version stays at
  5.50.0, so the install pass runs on every upgrade, not only the first: on
  the next upgrade it queues those accounts for the unlock pass.

  LINKED FLAGS. The migration writes no linked state. A source with no linked
  entry is unlinked by definition, so every migrated source is unlinked and the
  first unlock after upgrade fires the link call (#68).

  Keep this module free of imports from `background/helpers/account`: several
  suites replace that module with partial mocks, and `dataStorage.ts` imports
  this file.
*/

/** `HW_PREFIX` in `background/helpers/account`; see the note above. */
const HW_KEY_PREFIX = "hw:";

/** The key manager's storage key for a keystore id. */
const keystoreStorageKey = (keyId: string) => `stellarkeys:${keyId}`;

export const isHardwareKeyId = (keyId: string) =>
  keyId.startsWith(HW_KEY_PREFIX);

export const getPendingAttribution = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<string[]> =>
  ((await localStore.getItem(PENDING_ATTRIBUTION_ID)) as string[]) || [];

/** Drops `keyId` from the pending list. A no-op when it is not there. */
export const removePendingAttribution = async ({
  localStore,
  keyId,
}: {
  localStore: DataStorageAccess;
  keyId: string;
}) => {
  const pending = await getPendingAttribution({ localStore });

  if (!pending.includes(keyId)) {
    return;
  }

  await localStore.setItem(
    PENDING_ATTRIBUTION_ID,
    pending.filter((id) => id !== keyId),
  );
};

/*
  Legacy repair, formerly inline in `handlers/loadAccount.ts`. The 3.0.0
  storage migration (and `normalizeMigratedData`, which JSON-parses every
  string) turned key-manager ids like "0.8123" into numbers. A numeric `keyId`
  breaks the `hw:` prefix checks and `keyManager.loadKey`.
*/
const coerceKeyIds = async (localStore: DataStorageAccess) => {
  const rawKeyId = (await localStore.getItem(KEY_ID)) as
    | string
    | number
    | null
    | undefined;

  if (typeof rawKeyId === "number") {
    await localStore.setItem(KEY_ID, rawKeyId.toString());
  }

  const rawKeyIdList = await localStore.getItem(KEY_ID_LIST);

  if (
    Array.isArray(rawKeyIdList) &&
    rawKeyIdList.some((id) => typeof id !== "string")
  ) {
    await localStore.setItem(KEY_ID_LIST, rawKeyIdList.map(String));
  }

  return {
    keyId: rawKeyId === null || rawKeyId === undefined ? "" : String(rawKeyId),
    keyIdList: Array.isArray(rawKeyIdList)
      ? (rawKeyIdList.map(String) as string[])
      : null,
  };
};

/*
  Legacy repair, formerly inline in `handlers/confirmPassword.ts`: a wallet
  from before the v1.0.6-beta data model has a `keyId` and no `keyIdList`.
  Unlike the old inline version, it requires the keystore to exist, so a stale
  `keyId` left behind by an interrupted reset is not resurrected as an account
  that can never be unlocked.
*/
const backfillKeyIdList = async (
  localStore: DataStorageAccess,
  keyId: string,
): Promise<string[]> => {
  if (!keyId || isHardwareKeyId(keyId)) {
    return [];
  }

  if (!(await localStore.getItem(keystoreStorageKey(keyId)))) {
    return [];
  }

  const keyIdList = [keyId];
  await localStore.setItem(KEY_ID_LIST, keyIdList);

  const encodedNames = (await localStore.getItem(ACCOUNT_NAME_LIST_ID)) as
    | string
    | undefined;
  const names = JSON.parse(
    decodeString(encodedNames || encodeObject({})),
  ) as Record<string, string>;

  if (!names[keyId]) {
    await localStore.setItem(
      ACCOUNT_NAME_LIST_ID,
      encodeObject({ ...names, [keyId]: "Account 1" }),
    );
  }

  return keyIdList;
};

/**
 * The install pass. Plain storage only, no password. Safe to run on empty
 * storage (a fresh install), where it writes nothing. Resolves false when it
 * left the storage untouched because the `keyIdList` shape is unknown, so the
 * caller can leave the storage version unadvanced and retry on a later start.
 */
export const migratePreV2Storage = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<boolean> => {
  const { keyId, keyIdList: storedKeyIdList } = await coerceKeyIds(localStore);

  if (storedKeyIdList === null) {
    const rawKeyIdList = await localStore.getItem(KEY_ID_LIST);
    // A present but non-array list is a shape this code does not understand.
    // Leave it alone rather than overwrite accounts it might describe.
    if (rawKeyIdList !== null && rawKeyIdList !== undefined) {
      return false;
    }
  }

  const keyIdList = storedKeyIdList?.length
    ? storedKeyIdList
    : await backfillKeyIdList(localStore, keyId);

  if (!keyIdList.length) {
    return true;
  }

  const provenance = await getAccountProvenance({ localStore });
  const pending = new Set(await getPendingAttribution({ localStore }));
  const pendingBefore = pending.size;

  for (const id of keyIdList) {
    if (provenance[id]) {
      continue;
    }

    if (isHardwareKeyId(id)) {
      // A hardware account holds no secret and is never a source.
      await setAccountProvenance({
        localStore,
        keyId: id,
        type: AccountType.HW,
      });
    } else {
      pending.add(id);
    }
  }

  if (pending.size !== pendingBefore) {
    await localStore.setItem(PENDING_ATTRIBUTION_ID, [...pending]);
  }

  return true;
};
