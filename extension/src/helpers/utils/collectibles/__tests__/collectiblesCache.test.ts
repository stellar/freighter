/**
 * Tests for collectiblesCache utility functions
 */
import {
  getCachedCollections,
  isContractInCache,
  hasValidCache,
  deduplicateContracts,
  ContractIdentifier,
} from "../collectiblesCache";
import { Collection } from "@shared/api/types/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

// Mock the store import
jest.mock("popup/App", () => ({
  store: {
    getState: jest.fn(),
  },
}));

import { store } from "popup/App";

const mockGetState = store.getState as jest.MockedFunction<
  typeof store.getState
>;

describe("collectiblesCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCachedCollections", () => {
    it("should return undefined when no cache exists", () => {
      mockGetState.mockReturnValue({
        cache: {
          collections: {},
        },
      } as any);

      const result = getCachedCollections(
        TESTNET_NETWORK_DETAILS.network,
        "GABC123",
      );

      expect(result).toBeUndefined();
    });

    it("should return cached collections for network and public key", () => {
      const mockCollections: Collection[] = [
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [],
          },
        },
      ];

      mockGetState.mockReturnValue({
        cache: {
          collections: {
            [TESTNET_NETWORK_DETAILS.network]: {
              GABC123: mockCollections,
            },
          },
        },
      } as any);

      const result = getCachedCollections(
        TESTNET_NETWORK_DETAILS.network,
        "GABC123",
      );

      expect(result).toEqual(mockCollections);
    });

    it("should return undefined for different network", () => {
      mockGetState.mockReturnValue({
        cache: {
          collections: {
            testnet: {
              GABC123: [],
            },
          },
        },
      } as any);

      const result = getCachedCollections("mainnet", "GABC123");

      expect(result).toBeUndefined();
    });

    it("should return undefined for different public key", () => {
      mockGetState.mockReturnValue({
        cache: {
          collections: {
            [TESTNET_NETWORK_DETAILS.network]: {
              GABC123: [],
            },
          },
        },
      } as any);

      const result = getCachedCollections(
        TESTNET_NETWORK_DETAILS.network,
        "GXYZ789",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("isContractInCache", () => {
    it("should return true when contract exists in collection", () => {
      const collections: Collection[] = [
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [],
          },
        },
      ];

      expect(isContractInCache(collections, "C123")).toBe(true);
    });

    it("should return true when contract exists in error object", () => {
      const collections: Collection[] = [
        {
          error: {
            collectionAddress: "C123",
            errorMessage: "Error message",
          },
        },
      ];

      expect(isContractInCache(collections, "C123")).toBe(true);
    });

    it("should return false when contract does not exist", () => {
      const collections: Collection[] = [
        {
          collection: {
            address: "C456",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [],
          },
        },
      ];

      expect(isContractInCache(collections, "C123")).toBe(false);
    });

    it("should return false for empty collections", () => {
      expect(isContractInCache([], "C123")).toBe(false);
    });

    it("should handle collections with both collection and error", () => {
      const collections: Collection[] = [
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [],
          },
        },
        {
          error: {
            collectionAddress: "C456",
            errorMessage: "Error message",
          },
        },
      ];

      expect(isContractInCache(collections, "C123")).toBe(true);
      expect(isContractInCache(collections, "C456")).toBe(true);
      expect(isContractInCache(collections, "C789")).toBe(false);
    });
  });

  describe("hasValidCache", () => {
    it("should return true for non-empty collections array", () => {
      const collections: Collection[] = [
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [],
          },
        },
      ];

      expect(hasValidCache(collections)).toBe(true);
    });

    it("should return false for undefined", () => {
      expect(hasValidCache(undefined)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(hasValidCache([])).toBe(false);
    });

    it("should act as a type guard", () => {
      const maybeCollections: Collection[] | undefined = [
        {
          collection: {
            address: "C123",
            name: "Collection 1",
            symbol: "COL1",
            collectibles: [],
          },
        },
      ];

      if (hasValidCache(maybeCollections)) {
        // TypeScript should know that maybeCollections is Collection[] here
        expect(maybeCollections.length).toBe(1);
      }
    });
  });

  describe("deduplicateContracts", () => {
    it("should return empty array for empty input", () => {
      expect(deduplicateContracts([])).toEqual([]);
    });

    it("should return same array when no duplicates", () => {
      const contracts: ContractIdentifier[] = [
        { id: "C123" },
        { id: "C456" },
        { id: "C789" },
      ];

      const result = deduplicateContracts(contracts);
      expect(result).toEqual(contracts);
    });

    it("should remove duplicate contracts by id", () => {
      const contracts: ContractIdentifier[] = [
        { id: "C123", token_ids: ["1"] },
        { id: "C456", token_ids: ["2"] },
        { id: "C123", token_ids: ["3"] }, // duplicate
        { id: "C789", token_ids: ["4"] },
      ];

      const result = deduplicateContracts(contracts);
      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(["C123", "C456", "C789"]);
      // Should keep the first occurrence
      expect(result[0].token_ids).toEqual(["1"]);
    });

    it("should handle multiple duplicates", () => {
      const contracts: ContractIdentifier[] = [
        { id: "C123" },
        { id: "C123" },
        { id: "C123" },
        { id: "C456" },
      ];

      const result = deduplicateContracts(contracts);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(["C123", "C456"]);
    });

    it("should preserve token_ids in first occurrence", () => {
      const contracts: ContractIdentifier[] = [
        { id: "C123", token_ids: ["1", "2"] },
        { id: "C123", token_ids: ["3", "4"] },
      ];

      const result = deduplicateContracts(contracts);
      expect(result).toHaveLength(1);
      expect(result[0].token_ids).toEqual(["1", "2"]);
    });

    it("should handle contracts without token_ids", () => {
      const contracts: ContractIdentifier[] = [
        { id: "C123" },
        { id: "C456", token_ids: ["1"] },
        { id: "C123" },
      ];

      const result = deduplicateContracts(contracts);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("C123");
      expect(result[0].token_ids).toBeUndefined();
    });

    it("should work with generic type extending ContractIdentifier", () => {
      interface ExtendedContract extends ContractIdentifier {
        extra: string;
      }

      const contracts: ExtendedContract[] = [
        { id: "C123", extra: "first" },
        { id: "C456", extra: "second" },
        { id: "C123", extra: "duplicate" },
      ];

      const result = deduplicateContracts(contracts);
      expect(result).toHaveLength(2);
      expect(result[0].extra).toBe("first");
      expect(result[1].extra).toBe("second");
    });
  });
});
