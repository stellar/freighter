/**
 * Tests for collectiblesBatchFetcher utility functions
 */
import {
  batchFetchCollectibles,
  mergeCollections,
} from "../collectiblesBatchFetcher";
import { Collection } from "@shared/api/types/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import {
  getCachedCollections,
  hasValidCache,
  deduplicateContracts,
} from "../collectiblesCache";
import { saveCollections } from "popup/ducks/cache";
import { store } from "popup/App";

jest.mock("popup/App", () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(),
  },
}));

jest.mock("popup/ducks/cache", () => ({
  ...jest.requireActual("popup/ducks/cache"),
  saveCollections: jest.fn((payload) => ({
    type: "saveCollections",
    payload,
  })),
}));

// Mock dependencies
jest.mock("@shared/api/helpers/fetchCollectibles");
jest.mock("../collectiblesCache", () => ({
  ...jest.requireActual("../collectiblesCache"),
  getCachedCollections: jest.fn(),
  hasValidCache: jest.fn(),
  deduplicateContracts: jest.fn(),
}));

const mockFetchCollectibles = fetchCollectibles as jest.MockedFunction<
  typeof fetchCollectibles
>;
const mockGetCachedCollections = getCachedCollections as jest.MockedFunction<
  typeof getCachedCollections
>;
const mockHasValidCache = hasValidCache as jest.MockedFunction<
  typeof hasValidCache
>;
const mockDeduplicateContracts = deduplicateContracts as jest.MockedFunction<
  typeof deduplicateContracts
>;
const mockSaveCollections = saveCollections as jest.MockedFunction<
  typeof saveCollections
>;
const mockDispatch = store.dispatch as jest.MockedFunction<
  typeof store.dispatch
>;

describe("collectiblesBatchFetcher", () => {
  const mockNetworkDetails: NetworkDetails = {
    network: "testnet",
    networkName: "Test Network",
    networkUrl: "https://testnet.example.com",
    networkPassphrase: "Test SDF Network ; September 2015",
  };

  const mockPublicKey = "GABC123456789";

  const mockCollection: Collection = {
    collection: {
      address: "C123",
      name: "Collection 1",
      symbol: "COL1",
      collectibles: [
        {
          collectionAddress: "C123",
          collectionName: "Collection 1",
          tokenId: "1",
          owner: mockPublicKey,
          tokenUri: "https://example.com/token1",
          metadata: {
            name: "Token 1",
            image: "https://example.com/image1.png",
          },
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockDeduplicateContracts.mockImplementation((contracts) => contracts);
    mockDispatch.mockClear();
    mockSaveCollections.mockClear();
  });

  describe("batchFetchCollectibles", () => {
    it("should return empty collections and fromCache=true for empty contracts", async () => {
      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [],
      });

      expect(result).toEqual({
        collections: [],
        fromCache: true,
      });
      expect(mockFetchCollectibles).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should return cached collections when all contracts are in cache", async () => {
      const cachedCollections: Collection[] = [
        mockCollection,
        {
          collection: {
            address: "C456",
            name: "Collection 2",
            symbol: "COL2",
            collectibles: [],
          },
        },
      ];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C456" }],
      });

      expect(result).toEqual({
        collections: cachedCollections,
        fromCache: true,
      });
      expect(mockFetchCollectibles).not.toHaveBeenCalled();
      expect(mockGetCachedCollections).toHaveBeenCalledWith(
        mockNetworkDetails.network,
        mockPublicKey,
      );
    });

    it("should return cached collections when requested token_ids exist in cache", async () => {
      const cachedCollections: Collection[] = [mockCollection];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123", token_ids: ["1"] }],
      });

      expect(result).toEqual({
        collections: cachedCollections,
        fromCache: true,
      });
      expect(mockFetchCollectibles).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should filter cached collections to only requested contracts", async () => {
      const cachedCollections: Collection[] = [
        mockCollection,
        {
          collection: {
            address: "C456",
            name: "Collection 2",
            symbol: "COL2",
            collectibles: [],
          },
        },
        {
          collection: {
            address: "C789",
            name: "Collection 3",
            symbol: "COL3",
            collectibles: [],
          },
        },
      ];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C456" }],
      });

      expect(result.collections).toHaveLength(2);
      expect(result.collections[0]).toEqual(mockCollection);
      expect(result.collections[1]).toEqual({
        collection: {
          address: "C456",
          name: "Collection 2",
          symbol: "COL2",
          collectibles: [],
        },
      });
      expect(result.fromCache).toBe(true);
      expect(mockFetchCollectibles).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should handle cached collections with error objects", async () => {
      const cachedCollections: Collection[] = [
        {
          error: {
            collectionAddress: "C123",
            errorMessage: "Error message",
          },
        },
      ];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }],
      });

      expect(result.collections).toEqual(cachedCollections);
      expect(result.fromCache).toBe(true);
    });

    it("should fetch missing token_ids and merge with cached collections", async () => {
      const cachedCollections: Collection[] = [mockCollection];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);

      const fetchedCollections: Collection[] = [
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [
              {
                collectionAddress: "C123",
                collectionName: "Collection 1",
                tokenId: "2",
                owner: mockPublicKey,
                tokenUri: "https://example.com/token2",
                metadata: {
                  name: "Token 2",
                  image: "https://example.com/image2.png",
                },
              },
            ],
          },
        },
      ];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123", token_ids: ["1", "2"] }],
      });

      expect(result.fromCache).toBe(false);
      expect(result.collections[0].collection?.collectibles).toHaveLength(2);
      expect(
        result.collections[0].collection?.collectibles?.map((c) => c.tokenId),
      ).toEqual(["1", "2"]);
      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [{ id: "C123", token_ids: ["2"] }],
        networkDetails: mockNetworkDetails,
      });
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockSaveCollections).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        collections: result.collections,
      });
    });

    it("should fetch from API when cache is empty", async () => {
      const fetchedCollections: Collection[] = [mockCollection];

      mockGetCachedCollections.mockReturnValue(undefined);
      mockHasValidCache.mockReturnValue(false);
      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }],
      });

      expect(result).toEqual({
        collections: fetchedCollections,
        fromCache: false,
      });
      expect(mockFetchCollectibles).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockSaveCollections).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        collections: fetchedCollections,
      });
    });

    it("should fetch from API when not all contracts are in cache", async () => {
      const cachedCollections: Collection[] = [mockCollection];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);

      const fetchedCollections: Collection[] = [
        {
          collection: {
            address: "C456",
            name: "Collection 2",
            symbol: "COL2",
            collectibles: [],
          },
        },
      ];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C456" }],
      });

      expect(result).toEqual({
        collections: [mockCollection, ...fetchedCollections],
        fromCache: false,
      });
      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [{ id: "C456", token_ids: [] }],
        networkDetails: mockNetworkDetails,
      });
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockSaveCollections).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        collections: [mockCollection, ...fetchedCollections],
      });
    });

    it("should deduplicate contracts before fetching", async () => {
      mockGetCachedCollections.mockReturnValue(undefined);
      mockHasValidCache.mockReturnValue(false);

      const fetchedCollections: Collection[] = [mockCollection];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);
      mockDeduplicateContracts.mockReturnValue([{ id: "C123" }]);

      await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C123" }], // duplicates
      });

      expect(mockDeduplicateContracts).toHaveBeenCalledWith([
        { id: "C123" },
        { id: "C123" },
      ]);
      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [{ id: "C123", token_ids: [] }],
        networkDetails: mockNetworkDetails,
      });
      expect(mockDispatch).toHaveBeenCalled();
    });

    it("should ensure token_ids is always an array", async () => {
      mockGetCachedCollections.mockReturnValue(undefined);
      mockHasValidCache.mockReturnValue(false);

      const fetchedCollections: Collection[] = [mockCollection];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [
          { id: "C123" }, // no token_ids
          { id: "C456", token_ids: ["1", "2"] },
        ],
      });

      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [
          { id: "C123", token_ids: [] },
          { id: "C456", token_ids: ["1", "2"] },
        ],
        networkDetails: mockNetworkDetails,
      });
    });

    it("should use cache by default", async () => {
      const cachedCollections: Collection[] = [mockCollection];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }],
      });

      expect(result.fromCache).toBe(true);
      expect(mockGetCachedCollections).toHaveBeenCalled();
    });

    it("should handle API fetch errors gracefully", async () => {
      mockGetCachedCollections.mockReturnValue(undefined);
      mockHasValidCache.mockReturnValue(false);

      const error = new Error("API Error");
      mockFetchCollectibles.mockRejectedValue(error);

      await expect(
        batchFetchCollectibles({
          publicKey: mockPublicKey,
          networkDetails: mockNetworkDetails,
          contracts: [{ id: "C123" }],
        }),
      ).rejects.toThrow("API Error");
    });

    it("should only fetch contracts not in cache", async () => {
      const cachedC123: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      mockGetCachedCollections.mockReturnValue([cachedC123]);
      mockHasValidCache.mockReturnValue(true);

      const fetchedC456: Collection = {
        collection: {
          address: "C456",
          name: "Collection 2",
          symbol: "COL2",
          collectibles: [
            {
              collectionAddress: "C456",
              collectionName: "Collection 2",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      mockFetchCollectibles.mockResolvedValue([fetchedC456]);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C456" }],
      });

      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [{ id: "C456", token_ids: [] }],
        networkDetails: mockNetworkDetails,
      });
      expect(result.collections).toHaveLength(2);
      expect(result.collections[0]).toEqual(cachedC123);
      expect(result.collections[1]).toEqual(fetchedC456);
    });

    it("should skip fetching cached contracts with no token_ids", async () => {
      mockGetCachedCollections.mockReturnValue([mockCollection]);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }], // No token_ids specified
      });

      expect(mockFetchCollectibles).not.toHaveBeenCalled();
      expect(result.fromCache).toBe(true);
      expect(result.collections).toEqual([mockCollection]);
    });

    it("should return cached error collections without refetching", async () => {
      const errorCollection: Collection = {
        error: {
          collectionAddress: "C123",
          errorMessage: "Failed to fetch",
        },
      };

      mockGetCachedCollections.mockReturnValue([errorCollection]);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }],
      });

      expect(mockFetchCollectibles).not.toHaveBeenCalled();
      expect(result.collections[0]).toEqual(errorCollection);
      expect(result.fromCache).toBe(true);
    });

    it("should fetch only missing token_ids", async () => {
      const cachedWithToken1: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      mockGetCachedCollections.mockReturnValue([cachedWithToken1]);
      mockHasValidCache.mockReturnValue(true);

      const fetchedToken2: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "2",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token2",
              metadata: { name: "Token 2" },
            },
          ],
        },
      };

      mockFetchCollectibles.mockResolvedValue([fetchedToken2]);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123", token_ids: ["1", "2"] }],
      });

      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [{ id: "C123", token_ids: ["2"] }],
        networkDetails: mockNetworkDetails,
      });
      expect(result.collections[0].collection?.collectibles).toHaveLength(2);
    });

    it("should not fetch when all requested token_ids are in cache", async () => {
      mockGetCachedCollections.mockReturnValue([mockCollection]);
      mockHasValidCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123", token_ids: ["1"] }], // Token 1 is in cache
      });

      expect(mockFetchCollectibles).not.toHaveBeenCalled();
      expect(result.fromCache).toBe(true);
      expect(result.collections).toEqual([mockCollection]);
    });

    it("should handle partial cache hits with multiple contracts", async () => {
      const cachedC123: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      mockGetCachedCollections.mockReturnValue([cachedC123]);
      mockHasValidCache.mockReturnValue(true);

      const fetchedC456: Collection = {
        collection: {
          address: "C456",
          name: "Collection 2",
          symbol: "COL2",
          collectibles: [],
        },
      };

      mockFetchCollectibles.mockResolvedValue([fetchedC456]);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [
          { id: "C123", token_ids: ["1"] },
          { id: "C456", token_ids: ["1"] },
        ],
      });

      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [{ id: "C456", token_ids: ["1"] }],
        networkDetails: mockNetworkDetails,
      });
      expect(result.collections).toHaveLength(2);
      expect(result.collections[0]).toEqual(cachedC123);
      expect(result.collections[1]).toEqual(fetchedC456);
      expect(result.fromCache).toBe(false);
    });

    it("should dispatch saveCollections with merged results", async () => {
      const cachedC123: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      mockGetCachedCollections.mockReturnValue([cachedC123]);
      mockHasValidCache.mockReturnValue(true);

      const fetchedToken2: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "2",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token2",
              metadata: { name: "Token 2" },
            },
          ],
        },
      };

      mockFetchCollectibles.mockResolvedValue([fetchedToken2]);

      await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123", token_ids: ["1", "2"] }],
      });

      expect(mockDispatch).toHaveBeenCalled();
      const savedCollections = mockSaveCollections.mock.calls[0][0].collections;
      expect(savedCollections[0].collection?.collectibles).toHaveLength(2);
    });

    it("should handle multiple missing tokens across contracts", async () => {
      mockGetCachedCollections.mockReturnValue(undefined);
      mockHasValidCache.mockReturnValue(false);

      const fetchedCollections: Collection[] = [
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [
              {
                collectionAddress: "C123",
                collectionName: "Collection 1",
                tokenId: "1",
                owner: mockPublicKey,
                tokenUri: "https://example.com/token1",
                metadata: { name: "Token 1" },
              },
              {
                collectionAddress: "C123",
                collectionName: "Collection 1",
                tokenId: "2",
                owner: mockPublicKey,
                tokenUri: "https://example.com/token2",
                metadata: { name: "Token 2" },
              },
            ],
          },
        },
        {
          collection: {
            address: "C456",
            name: "Collection 2",
            symbol: "COL2",
            collectibles: [
              {
                collectionAddress: "C456",
                collectionName: "Collection 2",
                tokenId: "1",
                owner: mockPublicKey,
                tokenUri: "https://example.com/token1",
                metadata: { name: "Token 1" },
              },
            ],
          },
        },
      ];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [
          { id: "C123", token_ids: ["1", "2"] },
          { id: "C456", token_ids: ["1"] },
        ],
      });

      expect(result.collections).toHaveLength(2);
      expect(result.collections[0]).toEqual(fetchedCollections[0]);
      expect(result.collections[1]).toEqual(fetchedCollections[1]);
    });

    it("should preserve contract order in results", async () => {
      const fetchedCollections: Collection[] = [
        {
          collection: {
            address: "C456",
            name: "Collection 2",
            symbol: "COL2",
            collectibles: [],
          },
        },
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [],
          },
        },
      ];

      mockGetCachedCollections.mockReturnValue(undefined);
      mockHasValidCache.mockReturnValue(false);
      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [
          { id: "C123", token_ids: [] },
          { id: "C456", token_ids: [] },
        ],
      });

      expect(result.collections[0].collection?.address).toBe("C123");
      expect(result.collections[1].collection?.address).toBe("C456");
    });
  });

  describe("mergeCollections", () => {
    it("should return undefined when both cached and fetched are undefined", () => {
      const result = mergeCollections(undefined, undefined);
      expect(result).toBeUndefined();
    });

    it("should return cached when fetched is undefined", () => {
      const cached: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const result = mergeCollections(cached, undefined);
      expect(result).toEqual(cached);
    });

    it("should return fetched when cached is undefined", () => {
      const fetched: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const result = mergeCollections(undefined, fetched);
      expect(result).toEqual(fetched);
    });

    it("should merge collectibles from cached and fetched collections", () => {
      const cached: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const fetched: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "2",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token2",
              metadata: { name: "Token 2" },
            },
          ],
        },
      };

      const result = mergeCollections(cached, fetched);

      expect(result?.collection?.collectibles).toHaveLength(2);
      expect(result?.collection?.collectibles?.[0].tokenId).toBe("1");
      expect(result?.collection?.collectibles?.[1].tokenId).toBe("2");
    });

    it("should deduplicate collectibles by tokenId when merging", () => {
      const cached: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const fetched: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1-updated",
              metadata: { name: "Token 1 Updated" },
            },
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "2",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token2",
              metadata: { name: "Token 2" },
            },
          ],
        },
      };

      const result = mergeCollections(cached, fetched);

      expect(result?.collection?.collectibles).toHaveLength(2);
      // Should keep the cached version of token 1
      expect(result?.collection?.collectibles?.[0].metadata?.name).toBe(
        "Token 1",
      );
      expect(result?.collection?.collectibles?.[1].tokenId).toBe("2");
    });

    it("should return fetched when cached has error and fetched has collection", () => {
      const cached: Collection = {
        error: {
          collectionAddress: "C123",
          errorMessage: "Failed to fetch",
        },
      };

      const fetched: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const result = mergeCollections(cached, fetched);
      expect(result).toEqual(fetched);
    });

    it("should return fetched error when fetched has error", () => {
      const cached: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const fetched: Collection = {
        error: {
          collectionAddress: "C123",
          errorMessage: "New error",
        },
      };

      const result = mergeCollections(cached, fetched);
      expect(result).toEqual(fetched);
    });

    it("should handle empty collectibles arrays", () => {
      const cached: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [],
        },
      };

      const fetched: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const result = mergeCollections(cached, fetched);
      expect(result?.collection?.collectibles).toHaveLength(1);
      expect(result?.collection?.collectibles?.[0].tokenId).toBe("1");
    });

    it("should handle undefined collectibles arrays", () => {
      const cached: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
        },
      };

      const fetched: Collection = {
        collection: {
          address: "C123",
          name: "Collection 1",
          symbol: "COL1",
          collectibles: [
            {
              collectionAddress: "C123",
              collectionName: "Collection 1",
              tokenId: "1",
              owner: mockPublicKey,
              tokenUri: "https://example.com/token1",
              metadata: { name: "Token 1" },
            },
          ],
        },
      };

      const result = mergeCollections(cached, fetched);
      expect(result?.collection?.collectibles).toHaveLength(1);
      expect(result?.collection?.collectibles?.[0].tokenId).toBe("1");
    });
  });
});
