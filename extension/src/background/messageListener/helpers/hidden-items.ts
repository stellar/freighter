import { Store } from "redux";

import { AssetVisibility } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { allAccountsSelector } from "background/ducks/session";
import { getNetworksList } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

/**
 * Hidden items as `{ [publicKey]: { [network]: id[] } }`.
 */
export type HiddenItemStorage = Record<string, Record<string, string[]>>;

interface StorageKeys {
  // Old wallet-wide `{ id: visibility }` map, only read to migrate
  legacyKey: string;
  listKey: string;
}

interface StorageAccess {
  localStore: DataStorageAccess;
  sessionStore: Store;
}

/**
 * Copies the old wallet-wide map to every account on every network, then
 * deletes it, so it runs once. Needs an unlocked session to know the
 * accounts; until then it does nothing.
 */
const migrateWalletWideHiddenItems = async ({
  legacyKey,
  listKey,
  localStore,
  sessionStore,
}: StorageKeys & StorageAccess) => {
  const walletWide = (await localStore.getItem(legacyKey)) as
    | Record<string, AssetVisibility>
    | undefined;

  if (!walletWide) {
    return;
  }

  const accounts = allAccountsSelector(sessionStore.getState());

  if (!accounts.length) {
    return;
  }

  const hiddenIds = Object.keys(walletWide).filter(
    (id) => walletWide[id] === "hidden",
  );
  const networks = (
    (await getNetworksList({ localStore })) as NetworkDetails[]
  ).map(({ network }) => network);
  const storage: HiddenItemStorage = (await localStore.getItem(listKey)) || {};

  if (hiddenIds.length) {
    accounts.forEach(({ publicKey }) => {
      const byNetwork = storage[publicKey] || {};

      networks.forEach((network) => {
        const ids = byNetwork[network] || [];
        byNetwork[network] = [
          ...ids,
          ...hiddenIds.filter((id) => !ids.includes(id)),
        ];
      });

      storage[publicKey] = byNetwork;
    });
  }

  await localStore.setItem(listKey, storage);
  await localStore.remove(legacyKey);
};

/**
 * Reads hidden item storage, migrating the old map first if needed.
 */
const getHiddenItemStorage = async (
  args: StorageKeys & StorageAccess,
): Promise<HiddenItemStorage> => {
  await migrateWalletWideHiddenItems(args);
  return (await args.localStore.getItem(args.listKey)) || {};
};

/**
 * Converts a list of ids to the `{ id: "hidden" }` map the popup expects.
 */
const toHiddenMap = (ids: string[]): Record<string, AssetVisibility> =>
  Object.fromEntries(ids.map((id) => [id, "hidden" as AssetVisibility]));

/**
 * Hidden items for an account on a network, as `{ id: "hidden" }`.
 */
export const getHiddenItems = async ({
  publicKey,
  network,
  ...args
}: StorageKeys &
  StorageAccess & {
    publicKey: string;
    network: string;
  }) => {
  const storage = await getHiddenItemStorage(args);
  return toHiddenMap(storage[publicKey]?.[network] || []);
};

/**
 * Hides or shows an item for an account on a network. Removes entries that
 * end up empty.
 */
export const setHiddenItemVisibility = async ({
  publicKey,
  network,
  id,
  visibility,
  ...args
}: StorageKeys &
  StorageAccess & {
    publicKey: string;
    network: string;
    id: string;
    visibility: AssetVisibility;
  }) => {
  const storage = await getHiddenItemStorage(args);
  const byNetwork = storage[publicKey] || {};
  const ids = (byNetwork[network] || []).filter((item) => item !== id);

  if (visibility === "hidden") {
    ids.push(id);
  }

  if (ids.length) {
    byNetwork[network] = ids;
  } else {
    delete byNetwork[network];
  }

  if (Object.keys(byNetwork).length) {
    storage[publicKey] = byNetwork;
  } else {
    delete storage[publicKey];
  }

  await args.localStore.setItem(args.listKey, storage);
  return toHiddenMap(ids);
};
