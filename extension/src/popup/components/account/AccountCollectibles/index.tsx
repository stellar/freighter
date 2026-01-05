import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { Collection } from "@shared/api/types/types";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { CollectibleDetail, SelectedCollectible } from "../CollectibleDetail";

import "./styles.scss";
import { CollectibleInfoImage } from "../CollectibleInfo";

const CollectionsList = ({ collections }: { collections: Collection[] }) => {
  const { t } = useTranslation();
  const [selectedCollectible, setSelectedCollectible] =
    useState<SelectedCollectible | null>(null);

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
          {collection.collectibles.map((item) => (
            <Sheet
              open={selectedCollectible?.tokenId === item.tokenId}
              key={item.tokenId}
            >
              <div
                className="AccountCollectibles__collection__grid__item"
                onClick={() =>
                  setSelectedCollectible({
                    collectionAddress: collection.address,
                    tokenId: item.tokenId,
                  })
                }
                key={item.tokenId}
              >
                <CollectibleInfoImage
                  image={item.metadata?.image}
                  name={item.tokenId}
                />
              </div>
              <SheetContent
                aria-describedby={undefined}
                side="bottom"
                className="AccountCollectibles__collectible-detail__sheet"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <ScreenReaderOnly>
                  <SheetTitle>{item.tokenId}</SheetTitle>
                </ScreenReaderOnly>
                <CollectibleDetail
                  selectedCollectible={{
                    collectionAddress: collection.address,
                    tokenId: item.tokenId,
                  }}
                  handleItemClose={() => setSelectedCollectible(null)}
                />
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </div>
    );
  });
};

interface AccountCollectiblesProps {
  collections: Collection[];
  onClickCollectible?: (selectedCollectible: SelectedCollectible) => void;
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
