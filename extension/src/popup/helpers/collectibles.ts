import { Collection } from "@shared/api/types/types";

export const getUserCollections = ({
  collections,
  publicKey,
}: {
  collections: Collection[];
  publicKey: string;
}) => {
  if (collections.length === 0) {
    return [];
  }
  return collections
    .map((collection) => {
      if (!collection.collection) {
        return null;
      }
      const userCollectibles = collection.collection?.collectibles.filter(
        (collectible) => collectible.owner === publicKey,
      );
      if (userCollectibles && userCollectibles.length > 0) {
        return {
          ...collection,
          collection: {
            ...collection.collection,
            collectibles: userCollectibles,
          },
        };
      }
      return null;
    })
    .filter((collection) => collection !== null);
};

/**
 * Drops hidden collectibles, and any collection left with none, so a list
 * built from this shows exactly what Home shows. Entries without a
 * `collection` (an error for that address) pass through untouched; the
 * renderers already skip them.
 */
export const filterHiddenCollectibles = (
  collections: Collection[],
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean,
): Collection[] =>
  collections
    .map((entry) => {
      if (!entry.collection) {
        return entry;
      }
      const { address } = entry.collection;
      return {
        ...entry,
        collection: {
          ...entry.collection,
          collectibles: entry.collection.collectibles.filter(
            (item) => !isCollectibleHidden(address, item.tokenId),
          ),
        },
      };
    })
    .filter(
      (entry) => !entry.collection || entry.collection.collectibles.length > 0,
    );
