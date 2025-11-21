import { captureException } from "@sentry/browser";
import {
  CollectiblesResponse,
  Collection,
  CollectibleMetadata,
} from "../types";
import { NetworkDetails } from "@shared/constants/stellar";
import { INDEXER_V2_URL } from "@shared/constants/mercury";

const fetchCollectibleMetadata = async (tokenUri: string) => {
  let metadata: CollectibleMetadata | null = {
    name: "",
    description: "",
    image: "",
    externalUrl: "",
    attributes: [],
  };
  const response = await fetch(tokenUri);
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
    const { data } = (await response.json()) as { data: CollectiblesResponse };

    for (let i = 0; i < data.collections.length; i++) {
      const { collection } = data.collections[i];
      if (collection) {
        fetchedCollections.push({
          collection: {
            address: collection.address,
            name: collection.name,
            symbol: collection.symbol,
            collectibles: await Promise.all(
              collection.collectibles.map(async (collectible) => {
                const metadata = await fetchCollectibleMetadata(
                  collectible.token_uri,
                );
                return {
                  ...collectible,
                  metadata,
                  owner: collectible.owner,
                  tokenUri: collectible.token_uri,
                  tokenId: collectible.token_id,
                };
              }),
            ),
          },
        });
      }
    }

    console.log("fetchedCollections", fetchedCollections);
  } catch (e) {
    captureException(`Error fetching collectibles: ${e}`);
  }

  return fetchedCollections;
};
