import { Collection } from "@shared/api/types/types";

/**
 * Utility for preloading images with timeout and error handling.
 * Images that fail to load or timeout are silently ignored to prevent blocking.
 */

const DEFAULT_TIMEOUT_MS = 5000;

interface PreloadOptions {
  timeout?: number;
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Preloads images with timeout. Returns a promise that resolves when all images
 * have either loaded, failed, or timed out. Does not throw errors.
 */
export const preloadImages = async (
  imageUrls: string[],
  options: PreloadOptions = {},
): Promise<void> => {
  if (imageUrls.length === 0) {
    return;
  }

  const { timeout = DEFAULT_TIMEOUT_MS, onProgress } = options;
  let loadedCount = 0;

  const preloadImage = (url: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      let isResolved = false;

      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
          loadedCount++;
          onProgress?.(loadedCount, imageUrls.length);
          resolve();
        }
      };

      const timeoutId = setTimeout(() => {
        cleanup();
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        cleanup();
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
      };

      img.src = url;
    });
  };

  await Promise.all(imageUrls.map(preloadImage));
};

/**
 * Extracts image URLs from collectibles collections.
 */
export const extractImageUrls = (collections: Collection[]): string[] => {
  const images: string[] = [];

  for (const collection of collections) {
    const collectibles = collection.collection?.collectibles || [];
    for (const item of collectibles) {
      if (item.metadata?.image) {
        images.push(item.metadata.image);
      }
    }
  }

  return images;
};
