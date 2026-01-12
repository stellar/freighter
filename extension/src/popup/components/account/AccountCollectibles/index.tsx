import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Icon } from "@stellar/design-system";

import { Collection } from "@shared/api/types/types";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { publicKeySelector } from "popup/ducks/accountServices";
import { getUserCollections } from "popup/helpers/collectibles";

import { CollectibleDetail, SelectedCollectible } from "../CollectibleDetail";

import "./styles.scss";
import { CollectibleInfoImage } from "../CollectibleInfo";

const CollectionsList = ({ collections }: { collections: Collection[] }) => {
  const [selectedCollectible, setSelectedCollectible] =
    useState<SelectedCollectible | null>(null);

  return (
    <>
      {collections.map(({ collection, error }) => {
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
  const publicKey = useSelector(publicKeySelector);

  console.log(collections);
  const userCollections = getUserCollections({
    collections,
    publicKey,
  });

  console.log(userCollections);

  return (
    <div className="AccountCollectibles" data-testid="account-collectibles">
      {userCollections.length ? (
        <CollectionsList collections={userCollections} />
      ) : (
        <div className="AccountCollectibles__empty">
          <Icon.Grid01 />
          <span>{t("No collectibles yet")}</span>
        </div>
      )}
    </div>
  );
};
