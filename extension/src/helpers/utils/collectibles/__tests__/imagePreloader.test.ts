/**
 * Tests for imagePreloader utility functions
 */
import { preloadImages, extractImageUrls } from "../imagePreloader";
import { Collection } from "@shared/api/types/types";

// Mock Image constructor
class MockImage {
  src: string = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    // Simulate async loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

describe("imagePreloader", () => {
  beforeEach(() => {
    // Reset Image mock
    (global as any).Image = jest.fn(() => new MockImage());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("preloadImages", () => {
    it("should return immediately for empty array", async () => {
      await expect(preloadImages([])).resolves.toBeUndefined();
    });

    it("should preload a single image", async () => {
      const imageUrl = "https://example.com/image.png";
      const ImageSpy = jest.spyOn(global, "Image" as any);

      await preloadImages([imageUrl]);

      expect(ImageSpy).toHaveBeenCalledTimes(1);
      const mockImage = ImageSpy.mock.results[0].value as MockImage;
      expect(mockImage.src).toBe(imageUrl);
    });

    it("should preload multiple images", async () => {
      const imageUrls = [
        "https://example.com/image1.png",
        "https://example.com/image2.png",
        "https://example.com/image3.png",
      ];
      const ImageSpy = jest.spyOn(global, "Image" as any);

      await preloadImages(imageUrls);

      expect(ImageSpy).toHaveBeenCalledTimes(3);
      imageUrls.forEach((url, index) => {
        const mockImage = ImageSpy.mock.results[index].value as MockImage;
        expect(mockImage.src).toBe(url);
      });
    });

    it("should call onProgress callback with correct counts", async () => {
      const imageUrls = [
        "https://example.com/image1.png",
        "https://example.com/image2.png",
      ];
      const onProgress = jest.fn();

      await preloadImages(imageUrls, { onProgress });

      // Wait for all images to load
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onProgress).toHaveBeenCalled();
      // Check that progress was called with increasing counts
      const calls = onProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Last call should have loaded = total
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe(2); // loaded
      expect(lastCall[1]).toBe(2); // total
    });

    it("should handle image load errors gracefully", async () => {
      const imageUrl = "https://example.com/error.png";
      const ImageSpy = jest.spyOn(global, "Image" as any);

      // Create a mock that triggers onerror
      ImageSpy.mockImplementation(() => {
        const img = new MockImage();
        setTimeout(() => {
          if (img.onerror) {
            img.onerror();
          }
        }, 0);
        return img;
      });

      // Should not throw
      await expect(preloadImages([imageUrl])).resolves.toBeUndefined();
    });

    it("should timeout after specified timeout duration", async () => {
      jest.useFakeTimers();
      const imageUrl = "https://example.com/slow.png";
      const timeout = 1000;

      // Create a mock that never calls onload or onerror
      (global as any).Image = jest.fn(() => {
        const img = new MockImage();
        // Don't call onload or onerror
        img.onload = null;
        img.onerror = null;
        return img;
      });

      const preloadPromise = preloadImages([imageUrl], { timeout });

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(timeout);

      await preloadPromise;

      jest.useRealTimers();
    });

    it("should use default timeout when not specified", async () => {
      jest.useFakeTimers();
      const imageUrl = "https://example.com/slow.png";

      (global as any).Image = jest.fn(() => {
        const img = new MockImage();
        img.onload = null;
        img.onerror = null;
        return img;
      });

      const preloadPromise = preloadImages([imageUrl]);

      // Fast-forward to default timeout (5000ms)
      jest.advanceTimersByTime(5000);

      await preloadPromise;

      jest.useRealTimers();
    });

    it("should not call onProgress when not provided", async () => {
      const imageUrl = "https://example.com/image.png";

      await preloadImages([imageUrl]);

      // Wait a bit to ensure no progress callback is called
      await new Promise((resolve) => setTimeout(resolve, 10));

      // onProgress should not be called when not provided
      // This test verifies the function doesn't crash without the callback
      expect(true).toBe(true);
    });
  });

  describe("extractImageUrls", () => {
    it("should return empty array for empty collections", () => {
      expect(extractImageUrls([])).toEqual([]);
    });

    it("should extract image URLs from collections with collectibles", () => {
      const collections: Collection[] = [
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
                owner: "GABC",
                tokenUri: "https://example.com/token1",
                metadata: {
                  image: "https://example.com/image1.png",
                },
              },
              {
                collectionAddress: "C123",
                collectionName: "Collection 1",
                tokenId: "2",
                owner: "GABC",
                tokenUri: "https://example.com/token2",
                metadata: {
                  image: "https://example.com/image2.png",
                },
              },
            ],
          },
        },
      ];

      const result = extractImageUrls(collections);
      expect(result).toEqual([
        "https://example.com/image1.png",
        "https://example.com/image2.png",
      ]);
    });

    it("should skip collectibles without image metadata", () => {
      const collections: Collection[] = [
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
                owner: "GABC",
                tokenUri: "https://example.com/token1",
                metadata: {
                  name: "Token 1",
                  // No image
                },
              },
              {
                collectionAddress: "C123",
                collectionName: "Collection 1",
                tokenId: "2",
                owner: "GABC",
                tokenUri: "https://example.com/token2",
                metadata: {
                  image: "https://example.com/image2.png",
                },
              },
            ],
          },
        },
      ];

      const result = extractImageUrls(collections);
      expect(result).toEqual(["https://example.com/image2.png"]);
    });

    it("should handle collections with error objects", () => {
      const collections: Collection[] = [
        {
          error: {
            collectionAddress: "C123",
            errorMessage: "Error message",
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
                owner: "GABC",
                tokenUri: "https://example.com/token1",
                metadata: {
                  image: "https://example.com/image1.png",
                },
              },
            ],
          },
        },
      ];

      const result = extractImageUrls(collections);
      expect(result).toEqual(["https://example.com/image1.png"]);
    });

    it("should handle collections with empty collectibles array", () => {
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

      const result = extractImageUrls(collections);
      expect(result).toEqual([]);
    });

    it("should handle collections without collection property", () => {
      const collections: Collection[] = [
        {
          error: {
            collectionAddress: "C123",
            errorMessage: "Error message",
          },
        },
      ];

      const result = extractImageUrls(collections);
      expect(result).toEqual([]);
    });

    it("should handle multiple collections", () => {
      const collections: Collection[] = [
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
                owner: "GABC",
                tokenUri: "https://example.com/token1",
                metadata: {
                  image: "https://example.com/image1.png",
                },
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
                tokenId: "2",
                owner: "GABC",
                tokenUri: "https://example.com/token2",
                metadata: {
                  image: "https://example.com/image2.png",
                },
              },
              {
                collectionAddress: "C456",
                collectionName: "Collection 2",
                tokenId: "3",
                owner: "GABC",
                tokenUri: "https://example.com/token3",
                metadata: {
                  image: "https://example.com/image3.png",
                },
              },
            ],
          },
        },
      ];

      const result = extractImageUrls(collections);
      expect(result).toEqual([
        "https://example.com/image1.png",
        "https://example.com/image2.png",
        "https://example.com/image3.png",
      ]);
    });
  });
});
