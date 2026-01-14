import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { Collection, CollectibleKey } from "@shared/api/types/types";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { CollectibleDetail, SelectedCollectible } from "../CollectibleDetail";
import { CollectibleInfoImage } from "../CollectibleInfo";
import { useHiddenCollectibles } from "../hooks/useHiddenCollectibles";

import "./styles.scss";

const CollectionsList = ({
  collections,
  showHidden,
  hiddenCollectibles,
  onCloseCollectible,
}: {
  collections: Collection[];
  showHidden: boolean;
  hiddenCollectibles: Record<CollectibleKey, string>;
  onCloseCollectible: () => void;
}) => {
  const { t } = useTranslation();
  const [selectedCollectible, setSelectedCollectible] =
    useState<SelectedCollectible | null>(null);

  const isCollectibleHidden = (collectionAddress: string, tokenId: string) => {
    const key = `${collectionAddress}:${tokenId}`;
    return hiddenCollectibles[key] === "hidden";
  };

  const handleCloseCollectible = () => {
    setSelectedCollectible(null);
    onCloseCollectible();
  };

  // every collection has an error, so nothing to render
  if (collections.every((collection) => collection.error)) {
    return (
      <div className="AccountCollectibles__empty">
        <Icon.Grid01 />
        <span>{t("Error loading collectibles")}</span>
      </div>
    );
  }

  return (
    <>
      {collections.map(({ collection, error }) => {
        // if the collection is missing or has an error, skip rendering
        if (error || !collection) {
          return null;
        }

        // filter collectibles based on showHidden toggle
        const collectiblesToShow = showHidden
          ? collection.collectibles.filter((item) =>
              isCollectibleHidden(collection.address, item.tokenId),
            )
          : collection.collectibles.filter(
              (item) => !isCollectibleHidden(collection.address, item.tokenId),
            );

        // if no collectibles to show, don't render the collection
        if (collectiblesToShow.length === 0) {
          return null;
        }

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
                {collectiblesToShow.length}
              </div>
            </div>
            <div
              className="AccountCollectibles__collection__grid"
              data-testid="account-collection-grid"
            >
              {collectiblesToShow.map((item) => (
                <Sheet
                  open={selectedCollectible?.tokenId === item.tokenId}
                  key={item.tokenId}
                >
                  <div
                    className={`AccountCollectibles__collection__grid__item${
                      showHidden
                        ? " AccountCollectibles__collection__grid__item--hidden"
                        : ""
                    }`}
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
                      handleItemClose={handleCloseCollectible}
                      isHidden={showHidden}
                    />
                  </SheetContent>
                </Sheet>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};

interface AccountCollectiblesProps {
  collections: Collection[];
  onClickCollectible?: (selectedCollectible: SelectedCollectible) => void;
}

export const AccountCollectibles = ({
  collections,
}: AccountCollectiblesProps) => {
  const { t } = useTranslation();
  const { hiddenCollectibles, refreshHiddenCollectibles } =
    useHiddenCollectibles();

  return (
    <div className="AccountCollectibles" data-testid="account-collectibles">
      {collections.length ? (
        <CollectionsList
          collections={collections}
          showHidden={false}
          hiddenCollectibles={hiddenCollectibles}
          onCloseCollectible={refreshHiddenCollectibles}
        />
      ) : (
        <div className="AccountCollectibles__empty">
          <Icon.Grid01 />
          <span>{t("No collectibles yet")}</span>
        </div>
      )}
    </div>
  );
};
