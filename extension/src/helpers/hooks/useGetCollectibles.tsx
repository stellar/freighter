import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { initialState, reducer } from "helpers/request";
import { Collectibles } from "@shared/api/types/types";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import { NetworkDetails } from "@shared/constants/stellar";
import { captureException } from "@sentry/browser";
import { getCollectibles } from "@shared/api/internal";
import { AppDispatch, store } from "popup/App";
import { saveCollections, collectionsSelector } from "popup/ducks/cache";

const preloadImages = async (images: string[]) => {
  const promises = images.map((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = resolve;
      img.onerror = reject;
    });
  });
  try {
    await Promise.all(promises);
  } catch (error) {
    captureException(error);
  }
};

export interface FetchCollectiblesParams {
  publicKey: string;
  networkDetails: NetworkDetails;
  contract?: { id: string; token_ids: string[] };
}

function useGetCollectibles({ useCache = true }: { useCache?: boolean }) {
  const [state, dispatch] = useReducer(
    reducer<Collectibles, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();
  const cachedCollections = useSelector(collectionsSelector);
  const fetchData = async ({
    publicKey,
    networkDetails,
    contract,
  }: FetchCollectiblesParams) => {
    dispatch({ type: "FETCH_DATA_START" });
    /*
        Unlike the other cache hooks, this hook may be called multiple times within one render.
        For example, when constructing the history rows, this hook can be called many times as we iterate over the history items. 
        If we have cached collectibles earlier in the loop, we won't have access to the update redux state until the next render.
        To workaround this, we will also check the redux state manually here rather than waiting for the next render to 
        update the selector hook for us.
      */

    const cachedCollectionsData =
      cachedCollections[networkDetails.network]?.[publicKey] ||
      store.getState().cache.collections[networkDetails.network]?.[publicKey];

    if (useCache && cachedCollectionsData && cachedCollectionsData.length > 0) {
      // if we're requesting a specific contract, check if it's in the cache
      const isContractNotFound =
        contract &&
        !cachedCollectionsData.find(
          (collection) =>
            collection.error?.collectionAddress === contract.id ||
            collection.collection?.address === contract.id,
        );

      // if the contract is found in the cache, return the cached data
      if (!isContractNotFound) {
        const payload = {
          collections: cachedCollectionsData,
        };
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        return payload;
      }
    }

    const storedCollectibles = await getCollectibles({
      publicKey,
      network: networkDetails.network,
    });

    if (storedCollectibles.error) {
      dispatch({
        type: "FETCH_DATA_ERROR",
        payload: { error: storedCollectibles.error },
      });
      return { collections: [] } as Collectibles;
    }

    const storedContracts = storedCollectibles.collectiblesList.map(
      (collectible) => ({
        id: collectible.id,
        token_ids: collectible.tokenIds,
      }),
    );

    // Filter out duplicates: if a contract is already in storedContracts and also
    // passed as the contract parameter, we only want to fetch it once
    const contractsToFetch = [
      ...storedContracts,
      ...(contract ? [contract] : []),
    ].filter(
      (contract, index, self) =>
        index === self.findIndex((c) => c.id === contract.id),
    );

    try {
      const collectibles = await fetchCollectibles({
        publicKey,
        contracts: contractsToFetch,
        networkDetails,
      });

      const images: string[] = [];

      collectibles.forEach((collection) => {
        const collectionList = collection.collection || { collectibles: [] };
        collectionList.collectibles.forEach((item) => {
          if (item.metadata?.image) {
            images.push(item.metadata.image);
          }
        });
      });

      // to prevent the images from flickering, we preload the images before rendering them
      await preloadImages(images);

      const payload = {
        collections: collectibles,
      } as Collectibles;

      reduxDispatch(
        saveCollections({
          publicKey,
          networkDetails,
          collections: payload.collections,
        }),
      );

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });

      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return { collections: [] } as Collectibles;
    }
  };

  return { state, fetchData };
}

export { useGetCollectibles };
