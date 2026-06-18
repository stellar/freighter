import { fetchCollectibles } from "../fetchCollectibles";
import { fetchMetadataJson } from "../fetchMetadataJson";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { INDEXER_V2_URL } from "@shared/constants/mercury";

jest.mock("../fetchMetadataJson", () => ({
  fetchMetadataJson: jest.fn(),
}));

const mockedFetchMetadataJson = fetchMetadataJson as jest.Mock;

describe("fetchCollectibles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return collectibles", async () => {
    const metadata = {
      name: "Collectible Name",
      description: "Collectible Description",
      image: "https://nftcalendar.io/image.png",
      external_url: "https://nftcalendar.io",
      attributes: [
        {
          trait_type: "Trait Type",
          value: "Trait Value",
        },
      ],
    };

    mockedFetchMetadataJson.mockResolvedValue(metadata);

    // @ts-ignore
    jest.spyOn(global, "fetch").mockImplementation((url: any) => {
      if (url.toString() === `${INDEXER_V2_URL}/collectibles?network=TESTNET`) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                collections: [
                  {
                    collection: {
                      address: "C1",
                      name: "C1",
                      symbol: "SYM",
                      collectibles: [
                        {
                          owner: "G1",
                          token_id: "1",
                          token_uri: "https://nftcalendar.io/token/1",
                        },
                      ],
                    },
                  },
                  {
                    collection: {
                      address: "C1",
                      name: "C1",
                      symbol: "SYM",
                      collectibles: [
                        {
                          owner: "G2",
                          token_id: "2",
                          token_uri: "https://nftcalendar.io/token/2",
                        },
                      ],
                    },
                  },
                ],
              },
            }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    const collectibles = await fetchCollectibles({
      publicKey: "G1",
      contracts: [{ id: "C1", token_ids: ["1"] }],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(collectibles).toEqual([
      {
        collection: {
          address: "C1",
          name: "C1",
          symbol: "SYM",
          collectibles: [
            {
              collectionAddress: "C1",
              collectionName: "C1",
              metadata: {
                name: "Collectible Name",
                description: "Collectible Description",
                image: "https://nftcalendar.io/image.png",
                externalUrl: "https://nftcalendar.io",
                attributes: [
                  {
                    traitType: "Trait Type",
                    value: "Trait Value",
                  },
                ],
              },
              owner: "G1",
              tokenId: "1",
              tokenUri: "https://nftcalendar.io/token/1",
            },
          ],
        },
      },
      {
        collection: {
          address: "C1",
          name: "C1",
          symbol: "SYM",
          collectibles: [
            {
              collectionAddress: "C1",
              collectionName: "C1",
              metadata: {
                name: "Collectible Name",
                description: "Collectible Description",
                image: "https://nftcalendar.io/image.png",
                externalUrl: "https://nftcalendar.io",
                attributes: [
                  {
                    traitType: "Trait Type",
                    value: "Trait Value",
                  },
                ],
              },
              owner: "G2",
              tokenId: "2",
              tokenUri: "https://nftcalendar.io/token/2",
            },
          ],
        },
      },
    ]);

    expect(mockedFetchMetadataJson).toHaveBeenCalledWith(
      "https://nftcalendar.io/token/1",
    );
    expect(mockedFetchMetadataJson).toHaveBeenCalledWith(
      "https://nftcalendar.io/token/2",
    );
  });

  it("should return collectibles for owner with no metadata", async () => {
    mockedFetchMetadataJson.mockRejectedValue(
      new Error("metadata unavailable"),
    );

    // @ts-ignore
    jest.spyOn(global, "fetch").mockImplementation((url: any) => {
      if (url.toString() === `${INDEXER_V2_URL}/collectibles?network=TESTNET`) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                collections: [
                  {
                    collection: {
                      address: "C1",
                      name: "C1",
                      symbol: "SYM",
                      collectibles: [
                        {
                          owner: "G1",
                          token_id: "1",
                          token_uri: "https://nftcalendar.io/token/1",
                        },
                      ],
                    },
                  },
                ],
              },
            }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    const collectibles = await fetchCollectibles({
      publicKey: "G1",
      contracts: [{ id: "C1", token_ids: ["1"] }],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(collectibles).toEqual([
      {
        collection: {
          address: "C1",
          name: "C1",
          symbol: "SYM",
          collectibles: [
            {
              collectionAddress: "C1",
              collectionName: "C1",
              metadata: null,
              owner: "G1",
              tokenId: "1",
              tokenUri: "https://nftcalendar.io/token/1",
            },
          ],
        },
      },
    ]);
  });
});
