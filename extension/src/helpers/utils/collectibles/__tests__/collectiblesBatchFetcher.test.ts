/**
 * Tests for collectiblesBatchFetcher utility functions
 */
import { batchFetchCollectibles } from "../collectiblesBatchFetcher";
import { Collection } from "@shared/api/types/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { fetchCollectibles } from "@shared/api/helpers/fetchCollectibles";
import {
  getCachedCollections,
  isContractInCache,
  hasValidCache,
  deduplicateContracts,
} from "../collectiblesCache";

// Mock dependencies
jest.mock("@shared/api/helpers/fetchCollectibles");
jest.mock("../collectiblesCache", () => ({
  ...jest.requireActual("../collectiblesCache"),
  getCachedCollections: jest.fn(),
  isContractInCache: jest.fn(),
  hasValidCache: jest.fn(),
  deduplicateContracts: jest.fn(),
}));

const mockFetchCollectibles = fetchCollectibles as jest.MockedFunction<
  typeof fetchCollectibles
>;
const mockGetCachedCollections = getCachedCollections as jest.MockedFunction<
  typeof getCachedCollections
>;
const mockIsContractInCache = isContractInCache as jest.MockedFunction<
  typeof isContractInCache
>;
const mockHasValidCache = hasValidCache as jest.MockedFunction<
  typeof hasValidCache
>;
const mockDeduplicateContracts = deduplicateContracts as jest.MockedFunction<
  typeof deduplicateContracts
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
      mockIsContractInCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C456" }],
        useCache: true,
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
      mockIsContractInCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C456" }],
        useCache: true,
      });

      expect(result.collections).toHaveLength(2);
      expect(result.collections[0].collection?.address).toBe("C123");
      expect(result.collections[1].collection?.address).toBe("C456");
      expect(result.fromCache).toBe(true);
      expect(mockFetchCollectibles).not.toHaveBeenCalled();
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
      mockIsContractInCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }],
        useCache: true,
      });

      expect(result.collections).toEqual(cachedCollections);
      expect(result.fromCache).toBe(true);
    });

    it("should fetch from API when cache is disabled", async () => {
      const fetchedCollections: Collection[] = [mockCollection];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }],
        useCache: false,
      });

      expect(result).toEqual({
        collections: fetchedCollections,
        fromCache: false,
      });
      expect(mockFetchCollectibles).toHaveBeenCalledWith({
        publicKey: mockPublicKey,
        contracts: [{ id: "C123", token_ids: [] }],
        networkDetails: mockNetworkDetails,
      });
      expect(mockGetCachedCollections).not.toHaveBeenCalled();
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
        useCache: true,
      });

      expect(result).toEqual({
        collections: fetchedCollections,
        fromCache: false,
      });
      expect(mockFetchCollectibles).toHaveBeenCalled();
    });

    it("should fetch from API when not all contracts are in cache", async () => {
      const cachedCollections: Collection[] = [mockCollection];

      mockGetCachedCollections.mockReturnValue(cachedCollections);
      mockHasValidCache.mockReturnValue(true);
      mockIsContractInCache.mockImplementation((_, contractId) => {
        return contractId === "C123";
      });

      const fetchedCollections: Collection[] = [
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

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C456" }],
        useCache: true,
      });

      expect(result).toEqual({
        collections: fetchedCollections,
        fromCache: false,
      });
      expect(mockFetchCollectibles).toHaveBeenCalled();
    });

    it("should deduplicate contracts before fetching", async () => {
      const fetchedCollections: Collection[] = [mockCollection];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);
      mockDeduplicateContracts.mockReturnValue([{ id: "C123" }]);

      await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }, { id: "C123" }], // duplicates
        useCache: false,
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
    });

    it("should ensure token_ids is always an array", async () => {
      const fetchedCollections: Collection[] = [mockCollection];

      mockFetchCollectibles.mockResolvedValue(fetchedCollections);

      await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [
          { id: "C123" }, // no token_ids
          { id: "C456", token_ids: ["1", "2"] },
        ],
        useCache: false,
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
      mockIsContractInCache.mockReturnValue(true);

      const result = await batchFetchCollectibles({
        publicKey: mockPublicKey,
        networkDetails: mockNetworkDetails,
        contracts: [{ id: "C123" }],
        // useCache not specified, should default to true
      });

      expect(result.fromCache).toBe(true);
      expect(mockGetCachedCollections).toHaveBeenCalled();
    });

    it("should handle API fetch errors gracefully", async () => {
      const error = new Error("API Error");
      mockFetchCollectibles.mockRejectedValue(error);

      await expect(
        batchFetchCollectibles({
          publicKey: mockPublicKey,
          networkDetails: mockNetworkDetails,
          contracts: [{ id: "C123" }],
          useCache: false,
        }),
      ).rejects.toThrow("API Error");
    });
  });
});
