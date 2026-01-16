import { Collection } from "@shared/api/types/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import { store } from "popup/App";
import { saveCollections } from "popup/ducks/cache";
import {
  getCachedCollections,
  hasValidCache,
  deduplicateContracts,
  ContractIdentifier,
} from "./collectiblesCache";

export interface BatchFetchParams {
  publicKey: string;
  networkDetails: NetworkDetails;
  contracts: ContractIdentifier[];
}

export interface BatchFetchResult {
  collections: Collection[];
  fromCache: boolean;
}

const getCollectionAddress = (collection: Collection) =>
  collection.collection?.address || collection.error?.collectionAddress;

export const mergeCollections = (
  cached: Collection | undefined,
  fetched: Collection | undefined,
): Collection | undefined => {
  if (cached && fetched) {
    if (fetched.collection && cached.collection) {
      const existing = cached.collection.collectibles ?? [];
      const incoming = fetched.collection.collectibles ?? [];
      const seen = new Set(existing.map((c) => c.tokenId));
      const mergedCollectibles = [
        ...existing,
        ...incoming.filter((collectible) => !seen.has(collectible.tokenId)),
      ];

      return {
        collection: {
          ...cached.collection,
          collectibles: mergedCollectibles,
        },
      };
    }

    if (fetched.collection && cached.error) {
      return fetched;
    }

    if (fetched.error) {
      return fetched;
    }

    return fetched;
  }

  return fetched || cached;
};

/**
 * Batch fetches collectibles for multiple contracts.
 *
 * This is the proper way to handle the history use case where
 * we need to fetch collectibles for multiple contracts.
 *
 * Instead of calling useGetCollectibles hook N times in a loop
 * (which violates React hooks rules and causes performance issues),
 * collect all contract IDs first, then batch fetch them in a single call.
 *
 * @example
 * ```typescript
 * // ❌ BAD: Calling hook in a loop
 * transactions.map(tx => {
 *   const { fetchData } = useGetCollectibles();
 *   await fetchData({ contract: { id: tx.contractId } });
 * });
 *
 * // ✅ GOOD: Batch fetch all contracts
 * const contracts = transactions.map(tx => ({
 *   id: tx.contractId,
 *   token_ids: [tx.tokenId]
 * }));
 * const result = await batchFetchCollectibles({
 *   publicKey,
 *   networkDetails,
 *   contracts
 * });
 * ```
 */
export const batchFetchCollectibles = async (
  params: BatchFetchParams,
): Promise<BatchFetchResult> => {
  const { publicKey, networkDetails, contracts } = params;

  if (contracts.length === 0) {
    return { collections: [], fromCache: true };
  }

  const deduplicatedContracts = deduplicateContracts(contracts);
  const cached = getCachedCollections(networkDetails.network, publicKey);

  // Build cache map for efficient lookup
  const cachedByAddress = new Map<string, Collection>();
  if (hasValidCache(cached)) {
    cached.forEach((collection) => {
      const address = getCollectionAddress(collection);
      if (address) {
        cachedByAddress.set(address, collection);
      }
    });
  }

  // Check if all requested contracts are fully cached
  const isCached = (contract: ContractIdentifier): boolean => {
    const cachedEntry = cachedByAddress.get(contract.id);
    if (!cachedEntry) return false;

    const { token_ids = [] } = contract;
    if (token_ids.length === 0 || cachedEntry.error) return true;

    const cachedTokenIds =
      cachedEntry.collection?.collectibles?.map((c) => c.tokenId) ?? [];
    return token_ids.every((id) => cachedTokenIds.includes(id));
  };

  const allCached = deduplicatedContracts.every(isCached);
  if (allCached) {
    const filtered = cached!.filter((collection) => {
      const address = getCollectionAddress(collection);
      return deduplicatedContracts.some((contract) => contract.id === address);
    });
    return { collections: filtered, fromCache: true };
  }

  // Fetch only contracts/tokens not in cache
  const contractsToFetch: { id: string; token_ids: string[] }[] = [];

  deduplicatedContracts.forEach((contract) => {
    const cachedEntry = cachedByAddress.get(contract.id);
    const { token_ids = [] } = contract;

    // Contract not cached - fetch all requested tokens
    if (!cachedEntry) {
      contractsToFetch.push({ id: contract.id, token_ids });
      return;
    }

    // Contract has error or no specific tokens requested - already cached
    if (cachedEntry.error || token_ids.length === 0) {
      return;
    }

    // Fetch only missing tokens
    const cachedTokenIds =
      cachedEntry.collection?.collectibles?.map((c) => c.tokenId) ?? [];
    const missing = token_ids.filter((id) => !cachedTokenIds.includes(id));

    if (missing.length > 0) {
      contractsToFetch.push({ id: contract.id, token_ids: missing });
    }
  });

  const fetchedCollections =
    contractsToFetch.length > 0
      ? await fetchCollectibles({
          publicKey,
          contracts: contractsToFetch,
          networkDetails,
        })
      : [];

  // Build result by merging cached and fetched collections
  const fetchedById = new Map<string, Collection>();
  fetchedCollections.forEach((collection) => {
    const address = getCollectionAddress(collection);
    if (address) {
      fetchedById.set(address, collection);
    }
  });

  const result: Collection[] = [];
  const seen = new Set<string>();

  deduplicatedContracts.forEach((contract) => {
    if (!seen.has(contract.id)) {
      const merged = mergeCollections(
        cachedByAddress.get(contract.id),
        fetchedById.get(contract.id),
      );
      if (merged) {
        result.push(merged);
        seen.add(contract.id);
      }
    }
  });

  store.dispatch(
    saveCollections({
      publicKey,
      networkDetails,
      collections: result,
    }),
  );

  return { collections: result, fromCache: false };
};
