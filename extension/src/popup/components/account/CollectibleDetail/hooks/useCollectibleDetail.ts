import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { initialState, reducer } from "helpers/request";
import { CollectibleMetadata } from "@shared/api/types/types";
import { fetchCollectibleMetadata } from "@shared/api/helpers/fetchCollectibles";
import { captureException } from "@sentry/browser";
import { AppDispatch } from "popup/App";
import { collectionsSelector, saveCollections } from "popup/ducks/cache";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";

/**
 * Custom hook for managing collectible detail data fetching and caching.
 *
 * This hook provides functionality to fetch collectible metadata from a token URI
 * and update the cached collections in Redux store. It manages the request state
 * (loading, error, data) and automatically updates the cache when metadata is
 * successfully fetched.
 *
 * @returns {Object} An object containing:
 * @returns {Object} returns.state - The current request state (loading, error, data)
 * @returns {Function} returns.fetchData - Async function to fetch collectible metadata
 *
 * @example
 * ```tsx
 * const { state, fetchData } = useCollectibleDetail();
 *
 * // Fetch metadata for a collectible
 * await fetchData({
 *   collectionAddress: "C...",
 *   tokenId: "123",
 *   tokenUri: "https://example.com/metadata.json"
 * });
 * ```
 */
function useCollectibleDetail() {
  const [state, dispatch] = useReducer(
    reducer<CollectibleMetadata, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();
  const cachedCollections = useSelector(collectionsSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);

  /**
   * Fetches collectible metadata from the provided token URI and updates the cache.
   *
   * This function:
   * 1. Fetches metadata from the token URI
   * 2. Updates the Redux cache with the fetched metadata
   * 3. Handles errors and reports them to Sentry
   *
   * @param {Object} params - The parameters for fetching collectible data
   * @param {string} params.collectionAddress - The address of the collection contract
   * @param {string} params.tokenId - The unique token ID within the collection
   * @param {string} params.tokenUri - The URI to fetch the metadata from
   * @returns {Promise<void>} A promise that resolves when the fetch and cache update are complete
   *
   * @throws {Error} Errors are caught and reported to Sentry, then dispatched to state
   */
  const fetchData = async ({
    collectionAddress,
    tokenId,
    tokenUri,
  }: {
    collectionAddress: string;
    tokenId: string;
    tokenUri: string;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });

    let metadata: CollectibleMetadata | null = null;

    try {
      metadata = await fetchCollectibleMetadata(tokenUri);

      if (metadata) {
        const cachedCollectionsData = [
          ...(cachedCollections[networkDetails.network]?.[publicKey] || []),
        ];

        // replace the collectible with the new metadata
        const newCachedCollectionsData = cachedCollectionsData.map((c) => {
          if (c.collection?.address === collectionAddress) {
            return {
              ...c,
              collection: {
                ...c.collection!,
                collectibles: c.collection!.collectibles.map(
                  (collectionCollectible) => {
                    if (collectionCollectible.tokenId === tokenId) {
                      return { ...collectionCollectible, metadata };
                    }
                    return collectionCollectible;
                  },
                ),
              },
            };
          }
          return c;
        });

        reduxDispatch(
          saveCollections({
            publicKey,
            networkDetails,
            collections: newCachedCollectionsData,
          }),
        );
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: metadata });
      }
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: {} });
    } catch (error) {
      captureException(error);
      dispatch({ type: "FETCH_DATA_ERROR", payload: { error } });
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useCollectibleDetail };
