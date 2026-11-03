import { Store } from "redux";

import { AssetVisibility } from "@shared/api/types";
import { CollectibleKey } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  HIDDEN_COLLECTIBLES,
  HIDDEN_COLLECTIBLE_LIST,
} from "constants/localStorageTypes";
import { getHiddenItems, setHiddenItemVisibility } from "./hidden-items";

const STORAGE_KEYS = {
  legacyKey: HIDDEN_COLLECTIBLES,
  listKey: HIDDEN_COLLECTIBLE_LIST,
};

export const getHiddenCollectibles = async ({
  publicKey,
  network,
  localStore,
  sessionStore,
}: {
  publicKey: string;
  network: string;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => ({
  hiddenCollectibles: (await getHiddenItems({
    ...STORAGE_KEYS,
    publicKey,
    network,
    localStore,
    sessionStore,
  })) as Record<CollectibleKey, AssetVisibility>,
});

/**
 * Hides or shows a collectible for an account on a network.
 */
export const setCollectibleVisibility = async ({
  publicKey,
  network,
  collectible,
  visibility,
  localStore,
  sessionStore,
}: {
  publicKey: string;
  network: string;
  collectible: CollectibleKey;
  visibility: AssetVisibility;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => ({
  hiddenCollectibles: (await setHiddenItemVisibility({
    ...STORAGE_KEYS,
    publicKey,
    network,
    id: collectible,
    visibility,
    localStore,
    sessionStore,
  })) as Record<CollectibleKey, AssetVisibility>,
});
