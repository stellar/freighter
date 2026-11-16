import {
  fetchCollectibleMetadata,
  fetchCollectibles,
} from "../fetchCollectibles";
import { fetchMetadataJson } from "../fetchMetadataJson";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { SERVICE_TYPES } from "@shared/constants/services";
import { sendMessageToBackground } from "../extensionMessaging";

jest.mock("../fetchMetadataJson", () => ({
  fetchMetadataJson: jest.fn(),
}));

jest.mock("../extensionMessaging", () => ({
  sendMessageToBackground: jest.fn(),
}));

const mockedFetchMetadataJson = fetchMetadataJson as jest.Mock;
const mockedSendMessageToBackground = sendMessageToBackground as jest.Mock;

describe("fetchCollectibleMetadata", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should read metadata embedded in a data URI without fetching", async () => {
    const inlineMetadata = {
      name: "Stroopies 0",
      image: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
      attributes: [{ trait_type: "role", value: 3 }],
    };

    const metadata = await fetchCollectibleMetadata(
      `data:application/json,${JSON.stringify(inlineMetadata)}`,
    );

    expect(mockedFetchMetadataJson).not.toHaveBeenCalled();
    expect(metadata).toEqual({
      name: "Stroopies 0",
      description: undefined,
      image: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
      externalUrl: undefined,
      attributes: [{ traitType: "role", value: 3 }],
    });
  });

  it("should return null for a data URI that cannot be parsed", async () => {
    const metadata = await fetchCollectibleMetadata("data:text/html,<p>hi</p>");

    expect(mockedFetchMetadataJson).not.toHaveBeenCalled();
    expect(metadata).toBeNull();
  });

  it("should keep traits with a value of 0 and drop traits with no value", async () => {
    mockedFetchMetadataJson.mockResolvedValue({
      name: "Collectible Name",
      attributes: [
        { trait_type: "arms", value: 0 },
        { trait_type: "hat", value: 8 },
        { trait_type: "color", value: "blue" },
        { trait_type: "empty", value: "" },
        { trait_type: "missing" },
        { trait_type: "nullish", value: null },
        { value: "no trait type" },
      ],
    });

    const metadata = await fetchCollectibleMetadata(
      "https://nftcalendar.io/token/1",
    );

    expect(metadata?.attributes).toEqual([
      { traitType: "arms", value: 0 },
      { traitType: "hat", value: 8 },
      { traitType: "color", value: "blue" },
    ]);
  });
});

describe("fetchCollectibles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should route the /collectibles call through FETCH_BACKEND_V2 message", async () => {
    mockedSendMessageToBackground.mockResolvedValue({
      status: 200,
      body: { data: { collections: [] } },
    });

    await fetchCollectibles({
      publicKey: "G1",
      contracts: [{ id: "C1", token_ids: ["1"] }],
      networkDetails: { network: "PUBLIC" } as never,
    });

    expect(mockedSendMessageToBackground).toHaveBeenCalledWith({
      type: SERVICE_TYPES.FETCH_BACKEND_V2,
      activePublicKey: null,
      method: "POST",
      path: "/collectibles?network=PUBLIC",
      body: JSON.stringify({
        owner: "G1",
        contracts: [{ id: "C1", token_ids: ["1"] }],
      }),
    });
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

    mockedSendMessageToBackground.mockResolvedValue({
      status: 200,
      body: {
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
      },
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

    mockedSendMessageToBackground.mockResolvedValue({
      status: 200,
      body: {
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
      },
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
