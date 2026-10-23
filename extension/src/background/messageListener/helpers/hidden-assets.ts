import { Store } from "redux";

import { AssetVisibility, IssuerKey } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { allAccountsSelector } from "background/ducks/session";
import { getNetworksList } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HIDDEN_ASSETS, HIDDEN_ASSET_LIST } from "constants/localStorageTypes";

/**
 * Hidden assets as `{ [publicKey]: { [network]: canonical[] } }`.
 */
export type HiddenAssetStorage = Record<string, Record<string, IssuerKey[]>>;

/**
 * Copies the old wallet-wide list to every account on every network, then
 * deletes it, so it runs once. Needs an unlocked session to know the
 * accounts; until then it does nothing.
 */
const migrateWalletWideHiddenAssets = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const walletWide = (await localStore.getItem(HIDDEN_ASSETS)) as
    | Record<IssuerKey, AssetVisibility>
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
  const storage: HiddenAssetStorage =
    (await localStore.getItem(HIDDEN_ASSET_LIST)) || {};

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

  await localStore.setItem(HIDDEN_ASSET_LIST, storage);
  await localStore.remove(HIDDEN_ASSETS);
};

/**
 * Reads hidden asset storage, migrating the old list first if needed.
 */
const getHiddenAssetStorage = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}): Promise<HiddenAssetStorage> => {
  await migrateWalletWideHiddenAssets({ localStore, sessionStore });
  return (await localStore.getItem(HIDDEN_ASSET_LIST)) || {};
};

/**
 * Converts a list of ids to the `{ id: "hidden" }` map the popup expects.
 */
const toHiddenAssetsMap = (
  ids: IssuerKey[],
): Record<IssuerKey, AssetVisibility> =>
  Object.fromEntries(ids.map((id) => [id, "hidden" as AssetVisibility]));

export const getHiddenAssets = async ({
  publicKey,
  network,
  localStore,
  sessionStore,
}: {
  publicKey: string;
  network: string;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const storage = await getHiddenAssetStorage({ localStore, sessionStore });
  return {
    hiddenAssets: toHiddenAssetsMap(storage[publicKey]?.[network] || []),
  };
};

/**
 * Hides or shows an asset for an account on a network. Removes entries that
 * end up empty.
 */
export const setAssetVisibility = async ({
  publicKey,
  network,
  canonical,
  visibility,
  localStore,
  sessionStore,
}: {
  publicKey: string;
  network: string;
  canonical: IssuerKey;
  visibility: AssetVisibility;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const storage = await getHiddenAssetStorage({ localStore, sessionStore });
  const byNetwork = storage[publicKey] || {};
  const ids = (byNetwork[network] || []).filter((id) => id !== canonical);

  if (visibility === "hidden") {
    ids.push(canonical);
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

  await localStore.setItem(HIDDEN_ASSET_LIST, storage);
  return { hiddenAssets: toHiddenAssetsMap(ids) };
};
