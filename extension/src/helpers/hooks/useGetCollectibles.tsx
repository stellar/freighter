import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";

import { initialState, reducer } from "helpers/request";
import { Collectibles } from "@shared/api/types/types";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import { NetworkDetails } from "@shared/constants/stellar";
import { captureException } from "@sentry/browser";
import { getCollectibles } from "@shared/api/internal";
import { AppDispatch } from "popup/App";
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
  }: {
    publicKey: string;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });

    const cachedCollectionsData =
      cachedCollections[networkDetails.network]?.[publicKey];

    if (useCache && cachedCollectionsData) {
      const payload = {
        collections: cachedCollectionsData,
      };
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
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

    const contracts = storedCollectibles.collectiblesList.map(
      (collectible) => ({
        id: collectible.id,
        token_ids: collectible.tokenIds,
      }),
    );

    try {
      const collectibles = await fetchCollectibles({
        publicKey,
        contracts,
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
