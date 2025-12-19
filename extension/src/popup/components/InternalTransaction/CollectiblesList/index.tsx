import React from "react";
import { useTranslation } from "react-i18next";

import { Collectibles } from "@shared/api/types";
import {
  CollectibleInfoImage,
  getCollectibleName,
} from "popup/components/account/CollectibleInfo";

import "./styles.scss";

export const CollectiblesList = ({
  collectibles,
  onClickCollectible,
}: {
  collectibles: Collectibles;
  onClickCollectible: (selectedCollectible: {
    collectionName: string;
    collectionAddress: string;
    tokenId: string;
    name: string;
    image: string;
  }) => void;
}) => {
  const { t } = useTranslation();
  if (!collectibles.collections.length) {
    return (
      <div className="CollectiblesList__empty">
        {`${t("You have no collectibles added.")} ${t("Get started by adding a collectible.")}`}
      </div>
    );
  }

  const flattenedCollections = collectibles.collections.flatMap(
    (collection) => {
      if (collection.collection) {
        return collection.collection.collectibles;
      }
      return [];
    },
  );

  return (
    <div className="CollectiblesList__collections">
      {flattenedCollections.map((collection) => {
        const title =
          collection.metadata?.name || `${collection.collectionName}`;

        return (
          <div
            className="CollectiblesList__collection"
            key={title}
            onClick={() =>
              onClickCollectible({
                collectionName: collection.collectionName,
                collectionAddress: collection.collectionAddress,
                tokenId: collection.tokenId,
                name: getCollectibleName(
                  collection.metadata?.name,
                  collection.tokenId,
                ),
                image: collection.metadata?.image || "",
              })
            }
          >
            <div className="CollectiblesList__collection__image">
              <CollectibleInfoImage
                image={collection.metadata?.image}
                name={title}
                isSmall
              />
            </div>
            <div className="CollectiblesList__collection__title">{title}</div>
            <div className="CollectiblesList__collection__token-id">
              #{collection.tokenId}
            </div>
          </div>
        );
      })}
    </div>
  );
};
