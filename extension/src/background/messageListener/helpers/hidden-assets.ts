import { Store } from "redux";

import { AssetVisibility, IssuerKey } from "@shared/api/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HIDDEN_ASSETS, HIDDEN_ASSET_LIST } from "constants/localStorageTypes";
import { getHiddenItems, setHiddenItemVisibility } from "./hidden-items";

const STORAGE_KEYS = {
  legacyKey: HIDDEN_ASSETS,
  listKey: HIDDEN_ASSET_LIST,
};

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
}) => ({
  hiddenAssets: (await getHiddenItems({
    ...STORAGE_KEYS,
    publicKey,
    network,
    localStore,
    sessionStore,
  })) as Record<IssuerKey, AssetVisibility>,
});

/**
 * Hides or shows an asset for an account on a network.
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
}) => ({
  hiddenAssets: (await setHiddenItemVisibility({
    ...STORAGE_KEYS,
    publicKey,
    network,
    id: canonical,
    visibility,
    localStore,
    sessionStore,
  })) as Record<IssuerKey, AssetVisibility>,
});
