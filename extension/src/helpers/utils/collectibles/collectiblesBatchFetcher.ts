import { Collection } from "@shared/api/types/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import {
  getCachedCollections,
  isContractInCache,
  hasValidCache,
  deduplicateContracts,
  ContractIdentifier,
} from "./collectiblesCache";

export interface BatchFetchParams {
  publicKey: string;
  networkDetails: NetworkDetails;
  contracts: ContractIdentifier[];
  useCache?: boolean;
}

export interface BatchFetchResult {
  collections: Collection[];
  fromCache: boolean;
}

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
  const { publicKey, networkDetails, contracts, useCache = true } = params;

  if (contracts.length === 0) {
    return { collections: [], fromCache: true };
  }

  // Check cache first if enabled
  if (useCache) {
    const cached = getCachedCollections(networkDetails.network, publicKey);

    if (hasValidCache(cached)) {
      // Check if all requested contracts are in cache
      const allContractsCached = contracts.every((contract) =>
        isContractInCache(cached, contract.id),
      );

      if (allContractsCached) {
        // Filter to only return requested contracts
        const filtered = cached.filter((collection) => {
          const address =
            collection.collection?.address ||
            collection.error?.collectionAddress;
          return contracts.some((contract) => contract.id === address);
        });

        return { collections: filtered, fromCache: true };
      }
    }
  }

  // Fetch from API - ensure token_ids is always an array
  const deduplicatedContracts = deduplicateContracts(contracts);
  const contractsToFetch = deduplicatedContracts.map((contract) => ({
    id: contract.id,
    token_ids: contract.token_ids || [],
  }));

  const collections = await fetchCollectibles({
    publicKey,
    contracts: contractsToFetch,
    networkDetails,
  });

  return { collections, fromCache: false };
};
