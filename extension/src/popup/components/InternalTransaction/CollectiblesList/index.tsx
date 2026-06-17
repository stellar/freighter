import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { Collectibles } from "@shared/api/types";
import { publicKeySelector } from "popup/ducks/accountServices";
import {
  CollectibleInfoImage,
  getCollectibleName,
} from "popup/components/account/CollectibleInfo";
import { getUserCollections } from "popup/helpers/collectibles";

import "./styles.scss";

/* UI for displaying a vertical list of clickable collectibles grouped by collection */

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
  const publicKey = useSelector(publicKeySelector);
  const userCollectibles = getUserCollections({
    collections: collectibles.collections,
    publicKey,
  });

  if (!userCollectibles.length) {
    return (
      <div className="CollectiblesList__empty">
        {`${t("You have no collectibles added.")} ${t("Get started by adding a collectible.")}`}
      </div>
    );
  }

  return (
    <div className="CollectiblesList__collections">
      {userCollectibles.map((collection) => {
        if (!collection.collection) return null;
        const items = collection.collection.collectibles;
        const collectionName = items[0]?.collectionName || "";
        const collectionAddress = collection.collection.address;

        return (
          <div
            key={`${collectionAddress}-group`}
            className="CollectiblesList__collection-group"
          >
            <div className="CollectiblesList__section-header">
              <span className="CollectiblesList__section-header__name">
                {collectionName}
              </span>
              <div className="CollectiblesList__section-header__divider" />
              <span className="CollectiblesList__section-header__count">
                {items.length}
              </span>
            </div>
            {items.map((collectible) => {
              const title =
                collectible.metadata?.name || collectible.collectionName;
              return (
                <div
                  className="CollectiblesList__collection"
                  key={`${collectible.collectionAddress}-${collectible.tokenId}`}
                  onClick={() =>
                    onClickCollectible({
                      collectionName: collectible.collectionName,
                      collectionAddress: collectible.collectionAddress,
                      tokenId: collectible.tokenId,
                      name: getCollectibleName(
                        collectible.metadata?.name,
                        collectible.tokenId,
                      ),
                      image: collectible.metadata?.image || "",
                    })
                  }
                >
                  <div className="CollectiblesList__collection__image">
                    <CollectibleInfoImage
                      image={collectible.metadata?.image}
                      name={title}
                      isSmall
                    />
                  </div>
                  <div className="CollectiblesList__collection__title">
                    {title}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
