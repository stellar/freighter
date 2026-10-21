import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { DERIVATION_INDICES_ID } from "constants/localStorageTypes";

/*
  The derivation indices each seed phrase has in use, keyed by the phrase's
  source id, persisted in PLAIN local storage beside `secretSources`. An index
  is not secret, and plain storage is what lets the install-time migration
  (#76) seed "Seed Phrase 1"'s set from the old global counter with no
  password.

  A new account on a phrase takes that phrase's lowest unused index, so every
  phrase derives from 0 upward on its own. An index is marked the moment its
  keystore exists (`storeAccount`, `replaceAccount`) and released when the
  account is removed, so re-adding a removed account re-derives the same key.
  Secret-key sources have no indices and never get an entry.
*/

type DerivationIndexMap = Record<string, number[]>;

const getMap = async (localStore: DataStorageAccess) =>
  ((await localStore.getItem(DERIVATION_INDICES_ID)) as DerivationIndexMap) ||
  {};

/** The lowest non-negative integer not in `indices`. */
export const lowestUnusedIndex = (indices: number[]): number => {
  const used = new Set(indices);
  let index = 0;
  while (used.has(index)) {
    index += 1;
  }
  return index;
};

export const getDerivationIndices = async ({
  localStore,
  sourceId,
}: {
  localStore: DataStorageAccess;
  sourceId: string;
}): Promise<number[]> => (await getMap(localStore))[sourceId] || [];

/**
 * The index a new account on `sourceId` should take: the lowest one neither
 * marked used nor in `exclude`. `exclude` holds a caller's run-local
 * reservations (indices derived but not yet stored), so one run never hands
 * the same index out twice.
 */
export const nextDerivationIndex = async ({
  localStore,
  sourceId,
  exclude,
}: {
  localStore: DataStorageAccess;
  sourceId: string;
  exclude?: Set<number>;
}): Promise<number> =>
  lowestUnusedIndex([
    ...(await getDerivationIndices({ localStore, sourceId })),
    ...(exclude ?? []),
  ]);

/** Marks `index` used for `sourceId`. Idempotent; the set stays sorted. */
export const markDerivationIndexUsed = async ({
  localStore,
  sourceId,
  index,
}: {
  localStore: DataStorageAccess;
  sourceId: string;
  index: number;
}) => {
  const map = await getMap(localStore);
  const indices = map[sourceId] || [];

  if (indices.includes(index)) {
    return;
  }

  await localStore.setItem(DERIVATION_INDICES_ID, {
    ...map,
    [sourceId]: [...indices, index].sort((a, b) => a - b),
  });
};

/** Frees `index` on `sourceId` so the next add re-derives it. */
export const releaseDerivationIndex = async ({
  localStore,
  sourceId,
  index,
}: {
  localStore: DataStorageAccess;
  sourceId: string;
  index: number;
}) => {
  const map = await getMap(localStore);
  const indices = map[sourceId];

  if (!indices || !indices.includes(index)) {
    return;
  }

  await localStore.setItem(DERIVATION_INDICES_ID, {
    ...map,
    [sourceId]: indices.filter((i) => i !== index),
  });
};

export const clearDerivationIndices = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  await localStore.remove(DERIVATION_INDICES_ID);
};
