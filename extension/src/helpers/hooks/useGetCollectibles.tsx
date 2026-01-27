import { useReducer, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";

import { initialState, reducer } from "helpers/request";
import { State } from "constants/request";
import { Collectibles } from "@shared/api/types/types";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import { NetworkDetails } from "@shared/constants/stellar";
import { captureException } from "@sentry/browser";
import { getCollectibles } from "@shared/api/internal";
import { AppDispatch } from "popup/App";
import { saveCollections } from "popup/ducks/cache";
import {
  getCachedCollections,
  hasValidCache,
} from "helpers/utils/collectibles/collectiblesCache";
import {
  preloadImages,
  extractImageUrls,
} from "helpers/utils/collectibles/imagePreloader";

export interface FetchCollectiblesParams {
  publicKey: string;
  networkDetails: NetworkDetails;
}

interface UseGetCollectiblesOptions {
  useCache?: boolean;
}

interface UseGetCollectiblesReturn {
  state: State<Collectibles, Error>;
  fetchData: (params: FetchCollectiblesParams) => Promise<Collectibles>;
}

/**
 * Hook for fetching user's collectibles with caching and image preloading.
 *
 * NOTE: For batch fetching multiple contracts (e.g., in history views),
 * use the batchFetchCollectibles utility instead of calling this hook
 * multiple times in a loop.
 */
function useGetCollectibles({
  useCache = true,
}: UseGetCollectiblesOptions = {}): UseGetCollectiblesReturn {
  const [state, dispatch] = useReducer(
    reducer<Collectibles, Error>,
    initialState,
  );

  const reduxDispatch = useDispatch<AppDispatch>();

  const fetchData = useCallback(
    async ({
      publicKey,
      networkDetails,
    }: FetchCollectiblesParams): Promise<Collectibles> => {
      dispatch({ type: "FETCH_DATA_START" });

      try {
        // Check cache first if enabled
        if (useCache) {
          const cached = getCachedCollections(
            networkDetails.network,
            publicKey,
          );

          if (hasValidCache(cached)) {
            // Filter to only return collectibles with isUserStored flag
            // This prevents returning collectibles that were just cached for history
            const filteredCached = cached
              .map((c) => ({
                ...c,
                collection: c.collection
                  ? {
                      ...c.collection,
                      collectibles: c.collection.collectibles?.filter(
                        (col) => col.isUserStored === true,
                      ),
                    }
                  : undefined,
              }))
              .filter(
                (c) =>
                  c.collection?.collectibles &&
                  c.collection.collectibles.length > 0,
              );

            if (filteredCached.length > 0) {
              const payload: Collectibles = { collections: filteredCached };
              dispatch({ type: "FETCH_DATA_SUCCESS", payload });
              return payload;
            }
          }
        }

        // Fetch stored collectibles from internal API
        const storedCollectibles = await getCollectibles({
          publicKey,
          network: networkDetails.network,
        });

        if (storedCollectibles.error) {
          const error = new Error(storedCollectibles.error);
          dispatch({
            type: "FETCH_DATA_ERROR",
            payload: error,
          });
          return { collections: [] };
        }

        // Build contracts list from stored collectibles
        const storedContracts: Array<{ id: string; token_ids: string[] }> =
          storedCollectibles.collectiblesList.map((collectible) => ({
            id: collectible.id,
            token_ids: collectible.tokenIds,
          }));

        // Fetch collectibles from API
        // storedContracts may be empty, but this will still return special-cased collectibles like Meridian Pay
        const collections = await fetchCollectibles({
          publicKey,
          contracts: storedContracts.map((c) => ({
            id: c.id,
            token_ids: c.token_ids || [],
          })),
          networkDetails,
        });

        // Preload images in background (non-blocking with timeout)
        const imageUrls = extractImageUrls(collections);
        preloadImages(imageUrls).catch((error) => {
          // Silently handle image preload failures - they shouldn't block the UI
          captureException(error);
        });

        const payload: Collectibles = { collections };

        // Update cache with isUserStored flag set to true for each collectible
        const collectionsWithUserStored = payload.collections.map((c) => ({
          ...c,
          collection: c.collection
            ? {
                ...c.collection,
                collectibles: c.collection.collectibles?.map((col) => ({
                  ...col,
                  isUserStored: true,
                })),
              }
            : undefined,
        }));

        reduxDispatch(
          saveCollections({
            publicKey,
            networkDetails,
            collections: collectionsWithUserStored,
          }),
        );

        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        return payload;
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        captureException(errorObj);
        dispatch({
          type: "FETCH_DATA_ERROR",
          payload: errorObj,
        });
        return { collections: [] };
      }
    },
    [useCache, reduxDispatch],
  );

  return useMemo(
    () => ({
      state,
      fetchData,
    }),
    [state, fetchData],
  );
}

export { useGetCollectibles };
export type { UseGetCollectiblesReturn, UseGetCollectiblesOptions };
