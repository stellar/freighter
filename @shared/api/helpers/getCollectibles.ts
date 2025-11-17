import { captureException } from "@sentry/browser";
import { Collectibles, Collection } from "../types";
import { NetworkDetails } from "@shared/constants/stellar";
import { INDEXER_V2_URL } from "@shared/constants/mercury";

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

    fetchedCollections = data.collections;
  } catch (e) {
    captureException(`Error fetching collectibles: ${e}`);
  }

  return fetchedCollections;
};
