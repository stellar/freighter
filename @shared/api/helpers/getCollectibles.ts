import { captureException } from "@sentry/browser";
import { Collectibles, Collection, CollectibleMetadata } from "../types";
import { NetworkDetails } from "@shared/constants/stellar";
import { INDEXER_V2_URL } from "@shared/constants/mercury";

const fetchCollectibleMetadata = async (token_uri: string) => {
  let metadata: CollectibleMetadata | null = {
    name: "",
    description: "",
    image: "",
    externalUrl: "",
    attributes: [],
  };
  const response = await fetch(token_uri);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    name?: string;
    description?: string;
    external_url?: string;
    image?: string;
    attributes?: {
      traitType?: string;
      value?: string | number;
    }[];
  };

  if (!data) {
    return null;
  }

  metadata.name = data.name;
  metadata.description = data.description;
  metadata.externalUrl = data.external_url;
  metadata.attributes = data.attributes;
  metadata.image = data.image;

  return metadata;
};

export const getCollectibles = async ({
  publicKey,
  contracts,
  networkDetails,
}: {
  publicKey: string;
  contracts: { id: string; token_ids: string[] }[];
  networkDetails: NetworkDetails;
}) => {
  let fetchedCollections = [] as Collection[];
  console.log(contracts);
  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        owner: publicKey,
        contracts,
      }),
    };
    const url = new URL(`${INDEXER_V2_URL}/collectibles`);
    url.searchParams.append("network", networkDetails.network);
    const response = await fetch(url, options);
    if (!response.ok) {
      const _err = JSON.stringify(response);
      captureException(
        `Failed to fetch collectibles - ${response.status}: ${response.statusText}`,
      );

      throw new Error(_err);
    }
    const { data } = (await response.json()) as { data: Collectibles };

    console.log("data", data);

    for (let i = 0; i < data.collections.length; i++) {
      const { collection } = data.collections[i];
      if (collection) {
        for (let j = 0; j < collection.collectibles.length; j++) {
          const { token_uri } = collection.collectibles[j];
          const metadata = await fetchCollectibleMetadata(token_uri);
          collection.collectibles[j].metadata = metadata;
        }
      }
    }

    fetchedCollections = data.collections;
    console.log("fetchedCollections", fetchedCollections);
  } catch (e) {
    captureException(`Error fetching collectibles: ${e}`);
  }

  return fetchedCollections;
};
