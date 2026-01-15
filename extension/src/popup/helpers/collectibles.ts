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
