import { captureException } from "@sentry/browser";
import {
  CollectiblesResponse,
  Collection,
  CollectibleMetadata,
  CollectibleMetadataResponse,
} from "../types";
import { NetworkDetails } from "@shared/constants/stellar";
import { INDEXER_V2_URL } from "@shared/constants/mercury";

/**
 * Fetches metadata for a collectible from its token URI.
 * The metadata follows the NFT metadata standard and includes name, description,
 * image, external URL, and attributes.
 *
 * @param {string} tokenUri - The URI where the collectible metadata is hosted
 * @returns {Promise<CollectibleMetadata | null>} The collectible metadata object, or null if the fetch fails or the response is invalid
 */
export const fetchCollectibleMetadata = async (tokenUri: string) => {
  let metadata: CollectibleMetadata | null = {
    name: "",
    description: "",
    image: "",
    externalUrl: "",
    attributes: [],
  };

  try {
    const response = await fetch(tokenUri);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as CollectibleMetadataResponse;

    if (!data) {
      return null;
    }

    metadata.name = data.name;
    metadata.description = data.description;
    metadata.externalUrl = data.external_url;
    metadata.attributes = (data.attributes || [])
      .map((attr) => {
        if (attr.trait_type && attr.value) {
          return {
            traitType: attr.trait_type,
            value: attr.value,
          };
        }
        return null;
      })
      .filter((attr) => attr !== null);
    metadata.image = data.image;

    return metadata;
  } catch (e) {
    // we don't want to capture exceptions here because it's likely that some metadata
    // will not be found and that is out of our control
    return null;
  }
};

/**
 * Fetches collectibles (NFTs) for a given account from Freighter BE v2.
 * This function queries the API, filters collectibles by owner,
 * and enriches each collectible with metadata fetched from its token URI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.publicKey - The public key of the account to fetch collectibles for
 * @param {Array<{id: string, token_ids: string[]}>} params.contracts - Array of contract objects, each containing a contract ID and an array of token IDs to query
 * @param {NetworkDetails} params.networkDetails - Network configuration details (e.g., testnet, mainnet)
 * @returns {Promise<Collection[]>} Array of collection objects, each containing collectibles owned by the specified public key. Returns an empty array if the fetch fails or no collectibles are found.
 *
 * @example
 * ```typescript
 * const collectibles = await getCollectibles({
 *   publicKey: "GABC...",
 *   contracts: [{ id: "C123...", token_ids: ["1", "2"] }],
 *   networkDetails: { network: "testnet", ... }
 * });
 * ```
 */
export const fetchCollectibles = async ({
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
        if (collection.collectibles.length > 0) {
          // for each collectible, fetch the metadata from the token URI
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
                    collectionAddress: collection.address,
                    collectionName: collection.name,
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
      } else {
        const { error } = data.collections[i];
        if (error) {
          fetchedCollections.push({
            error: {
              collectionAddress: error.collection_address,
              errorMessage: error.error_message,
            },
          });
        }
      }
    }
  } catch (e) {
    captureException(`Error fetching collectibles: ${e}`);
  }

  return fetchedCollections;
};
