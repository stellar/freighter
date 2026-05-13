import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import { useLocation, useNavigate } from "react-router-dom";

import { Collection } from "@shared/api/types/types";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { ROUTES } from "popup/constants/routes";
import { CollectibleDetail, SelectedCollectible } from "../CollectibleDetail";
import { CollectibleInfoImage } from "../CollectibleInfo";

import "./styles.scss";

const CollectionsList = ({
  collections,
  showHidden,
  isCollectibleHidden,
  onCloseCollectible,
}: {
  collections: Collection[];
  showHidden: boolean;
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  onCloseCollectible: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<SelectedCollectible | null>(
    null,
  );

  const clearCollectibleDetailQueryParams = () => {
    const params = new URLSearchParams(location.search);
    if (!params.has("collection_detail") && !params.has("return_to")) {
      return;
    }

    params.delete("collection_detail");
    params.delete("collectible_token_id");
    params.delete("return_to");
    params.delete("return_asset");
    params.delete("return_collection_address");
    params.delete("return_collectible_token_id");

    navigate(
      {
        pathname: ROUTES.account,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true },
    );
  };

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const collectionAddress = params.get("collection_detail");
    const tokenId = params.get("collectible_token_id");

    if (collectionAddress && tokenId) {
      setDetailData({
        collectionAddress,
        tokenId,
      });
      setIsDetailOpen(true);
    }
  }, [location.search]);

  const handleOpenCollectible = (collectible: SelectedCollectible) => {
    setDetailData(collectible);
    setIsDetailOpen(true);
  };

  const handleCloseCollectible = () => {
    setIsDetailOpen(false);
    clearCollectibleDetailQueryParams();
    onCloseCollectible();
  };

  const handleAnimationEnd = () => {
    if (!isDetailOpen) {
      setDetailData(null);
    }
  };

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
                    handleOpenCollectible({
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
        open={isDetailOpen}
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
          onAnimationEnd={handleAnimationEnd}
        >
          <ScreenReaderOnly>
            <SheetTitle>{detailData?.tokenId || ""}</SheetTitle>
          </ScreenReaderOnly>
          {detailData && (
            <CollectibleDetail
              selectedCollectible={detailData}
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
  refreshHiddenCollectibles: () => Promise<void>;
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  onClickCollectible?: (selectedCollectible: SelectedCollectible) => void;
}

export const AccountCollectibles = ({
  collections,
  refreshHiddenCollectibles,
  isCollectibleHidden,
}: AccountCollectiblesProps) => {
  const { t } = useTranslation();

  // Check if there are any valid collections with collectibles
  const hasValidCollections = collections.some((c) => c.collection && !c.error);

  return (
    <div className="AccountCollectibles" data-testid="account-collectibles">
      {hasValidCollections ? (
        <CollectionsList
          collections={collections}
          showHidden={false}
          isCollectibleHidden={isCollectibleHidden}
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
