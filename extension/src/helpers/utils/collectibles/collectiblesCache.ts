import { Collection } from "@shared/api/types/types";
import { store } from "popup/App";

export interface ContractIdentifier {
  id: string;
  token_ids?: string[];
}

/**
 * Retrieves cached collections for a given network and public key.
 * Checks both the selector (for React components) and store directly
 * (for cases where cache might be updated in the same render cycle).
 */
export const getCachedCollections = (
  network: string,
  publicKey: string,
): Collection[] | undefined => {
  const state = store.getState();
  return state.cache.collections[network]?.[publicKey];
};

/**
 * Checks if a specific contract exists in the cached collections.
 */
export const isContractInCache = (
  collections: Collection[],
  contractId: string,
): boolean => {
  return collections.some(
    (collection) =>
      collection.error?.collectionAddress === contractId ||
      collection.collection?.address === contractId,
  );
};

/**
 * Checks if cached data exists and is valid (non-empty).
 */
export const hasValidCache = (
  collections: Collection[] | undefined,
): collections is Collection[] => {
  return collections !== undefined && collections.length > 0;
};

/**
 * Filters out duplicate contracts based on contract ID.
 * Uses a Set for O(n) performance instead of O(n²).
 */
export const deduplicateContracts = <T extends ContractIdentifier>(
  contracts: T[],
): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const contract of contracts) {
    if (!seen.has(contract.id)) {
      seen.add(contract.id);
      result.push(contract);
    }
  }

  return result;
};
