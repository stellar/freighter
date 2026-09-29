import { AssetVisibility } from "@shared/api/types/types";
import {
  DEFAULT_NETWORKS,
  NETWORK_NAMES,
  NetworkDetails,
} from "@shared/constants/stellar";
import { NETWORKS_LIST_ID } from "constants/localStorageTypes";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

/**
 * `{ [networkName]: { [publicKey]: { [key]: visibility } } }` -- the shape both
 * the hidden-assets and hidden-collectibles stores have taken since 5.46.0.
 */
export type VisibilityStore = Record<
  string,
  Record<string, Record<string, AssetVisibility>>
>;

/** The pre-5.46.0 shape: one flat map shared by every account on every network. */
export type LegacyVisibilityMap = Record<string, AssetVisibility>;

/**
 * The old value was a single flat `{ [key]: visibility }` map, so its leaves are
 * strings where the new shape has objects. A user whose storage version is
 * missing or ahead skips the migration, so every reader and writer has to
 * recognise the old shape rather than trust that the migration has run.
 */
export const isLegacyFlatVisibilityMap = (
  store: Record<string, unknown>,
): store is LegacyVisibilityMap =>
  Object.values(store).some((value) => typeof value === "string");

/**
 * Every network name a lookup could use, not just the three built-in ones.
 * Readers key off `networkDetails.networkName`, so a custom network the user
 * added needs its own bucket or nothing is ever hidden there.
 *
 * Seeded with the built-in names rather than taken from the saved list alone:
 * `DEFAULT_NETWORKS` holds only Mainnet and Testnet, so Futurenet would
 * otherwise lose its bucket for anyone who has not added it explicitly.
 */
export const getVisibilityNetworkNames = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<string[]> => {
  const networksList: NetworkDetails[] =
    (await localStore.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

  return Array.from(
    new Set([
      NETWORK_NAMES.PUBNET,
      NETWORK_NAMES.TESTNET,
      NETWORK_NAMES.FUTURENET,
      ...networksList
        .map((network) => network?.networkName)
        .filter((networkName): networkName is string => !!networkName),
    ]),
  );
};

/**
 * Move a legacy flat map into the new shape, under one account on every network.
 *
 * The user hid these deliberately, very often to bury a spam airdrop, so
 * dropping them is a visible regression -- but spreading them to accounts they
 * never touched would widen the very bug the 5.46.0 migration exists to fix,
 * with no one-step undo.
 */
export const nestLegacyVisibilityMap = ({
  legacyMap,
  publicKey,
  networkNames,
}: {
  legacyMap: LegacyVisibilityMap;
  publicKey: string;
  networkNames: string[];
}): VisibilityStore => {
  const byAccount = { [publicKey]: legacyMap };

  return networkNames.reduce(
    (store, networkName) => ({ ...store, [networkName]: { ...byAccount } }),
    {} as VisibilityStore,
  );
};

/** Empty buckets for every configured network. */
export const emptyVisibilityStore = (networkNames: string[]): VisibilityStore =>
  networkNames.reduce(
    (store, networkName) => ({ ...store, [networkName]: {} }),
    {} as VisibilityStore,
  );
