import React, { useState, useRef, useEffect } from "react";
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
  // Keep track of the last selected collectible so we can render it during close animation
  const lastSelectedCollectible = useRef<SelectedCollectible | null>(null);

  // Update the ref when a collectible is selected
  useEffect(() => {
    if (selectedCollectible) {
      lastSelectedCollectible.current = selectedCollectible;
    }
  }, [selectedCollectible]);

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

  // Get the collectible data for the detail view
  const getCollectibleForDetail = () => {
    const collectibleToUse =
      selectedCollectible || lastSelectedCollectible.current;
    if (!collectibleToUse) return null;

    for (const { collection } of collections) {
      if (!collection) continue;
      if (collection.address === collectibleToUse.collectionAddress) {
        const item = collection.collectibles.find(
          (c) => c.tokenId === collectibleToUse.tokenId,
        );
        if (item) {
          return { item, collectionAddress: collection.address };
        }
      }
    }
    return null;
  };

  const collectibleForDetail = getCollectibleForDetail();

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
              ))}
            </div>
          </div>
        );
      })}

      {/* Sheet rendered outside the map to persist during close animation */}
      <Sheet
        open={!!selectedCollectible}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCollectible();
          }
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          side="bottom"
          className="AccountCollectibles__collectible-detail__sheet"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScreenReaderOnly>
            <SheetTitle>
              {selectedCollectible?.tokenId ||
                lastSelectedCollectible.current?.tokenId ||
                ""}
            </SheetTitle>
          </ScreenReaderOnly>
          {collectibleForDetail && (
            <CollectibleDetail
              selectedCollectible={
                selectedCollectible || lastSelectedCollectible.current!
              }
              handleItemClose={handleCloseCollectible}
              isHidden={showHidden}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

interface AccountCollectiblesProps {
  collections: Collection[];
  hiddenCollectibles: Record<CollectibleKey, string>;
  refreshHiddenCollectibles: () => Promise<void>;
  onClickCollectible?: (selectedCollectible: SelectedCollectible) => void;
}

export const AccountCollectibles = ({
  collections,
  hiddenCollectibles,
  refreshHiddenCollectibles,
}: AccountCollectiblesProps) => {
  const { t } = useTranslation();

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
