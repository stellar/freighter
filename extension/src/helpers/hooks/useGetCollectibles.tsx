import { useReducer } from "react";

import { initialState, reducer } from "helpers/request";
import { Collection } from "@shared/api/types/types";
import { getCollectibles } from "@shared/api/helpers/getCollectibles";
import { NetworkDetails } from "@shared/constants/stellar";
import { captureException } from "@sentry/browser";

export interface Collectibles {
  collections: Collection[];
}

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

function useGetCollectibles() {
  const [state, dispatch] = useReducer(
    reducer<Collectibles, unknown>,
    initialState,
  );
  const fetchData = async ({
    publicKey,
    networkDetails,
  }: {
    publicKey: string;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });

    const collectibles = await getCollectibles({
      publicKey,
      contracts: [
        {
          id: "CDY2JQXVWASXQLXHPGKTDHKNZLVZI44NYPHN6HECRT6FTJ7PRCHAQ7QG",
          token_ids: ["1"],
        },
      ],
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

    await preloadImages(images);

    const payload = {
      collections: collectibles,
    } as Collectibles;

    dispatch({ type: "FETCH_DATA_SUCCESS", payload });

    return payload;
  };

  return { state, fetchData };
}

export { useGetCollectibles };
