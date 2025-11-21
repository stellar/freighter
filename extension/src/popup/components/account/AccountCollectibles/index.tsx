import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { Collection } from "@shared/api/types/types";

import "./styles.scss";

const CollectionsList = ({ collections }: { collections: Collection[] }) => {
  const { t } = useTranslation();

  // every collection has an error, so nothing to render
  if (collections.every((collection) => collection.error)) {
    return (
      <div className="AccountCollectibles__empty">
        <Icon.Grid01 />
        <span>{t("Error loading collectibles")}</span>
      </div>
    );
  }

  return collections.map(({ collection, error }) => {
    // if the collection is missing or has an error, skip rendering
    if (error || !collection) {
      return null;
    }

    // render the collection we do have
    return (
      <div
        className="AccountCollectibles__collection"
        key={collection.address}
        data-testid="account-collectible"
      >
        <div className="AccountCollectibles__collection__header">
          <div
            className="AccountCollectibles__collection__header__name"
            data-testid="account-collection-name"
          >
            <Icon.Grid01 />
            {collection.name}
          </div>
          <div
            className="AccountCollectibles__collection__header__count"
            data-testid="account-collection-count"
          >
            {collection.collectibles.length}
          </div>
        </div>
        <div
          className="AccountCollectibles__collection__grid"
          data-testid="account-collection-grid"
        >
          {collection.collectibles.map((item) => {
            if (!item.metadata) {
              return (
                <div
                  className="AccountCollectibles__collection__grid__item"
                  key={item.tokenId}
                >
                  <div
                    className="AccountCollectibles__collection__grid__item__placeholder"
                    data-testid="account-collectible-placeholder"
                  >
                    <Icon.Image01 />
                  </div>
                </div>
              );
            }
            return (
              <div
                className="AccountCollectibles__collection__grid__item"
                key={item.tokenId}
              >
                <img
                  data-testid="account-collectible-image"
                  src={item.metadata?.image}
                  alt={item.tokenId}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  });
};

export interface SelectedCollectible {
  collectionAddress: string;
  tokenId: string;
}

interface AccountCollectiblesProps {
  collections: Collection[];
  onClickCollectible?: (collectible: SelectedCollectible) => void;
}

export const AccountCollectibles = ({
  collections,
}: AccountCollectiblesProps) => {
  const { t } = useTranslation();
  return (
    <div className="AccountCollectibles" data-testid="account-collectibles">
      {collections.length ? (
        <CollectionsList collections={collections} />
      ) : (
        <div className="AccountCollectibles__empty">
          <Icon.Grid01 />
          <span>{t("No collectibles yet")}</span>
        </div>
      )}
    </div>
  );
};
