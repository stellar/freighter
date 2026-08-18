import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";
import { useLocation, useNavigate } from "react-router-dom";

import { Collection } from "@shared/api/types/types";
import { navigateTo } from "popup/helpers/navigate";
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
  // Tracks *collapsed* ids, so "expanded on mount" (spec D5) falls out of an
  // empty set. Local state only — not persisted, since chrome.storage is
  // background-owned and would pull a message handler into a styling change.
  const [collapsedCollections, setCollapsedCollections] = useState<Set<string>>(
    new Set(),
  );

  const toggleCollection = (address: string) => {
    setCollapsedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
      }
      return next;
    });
  };

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

        const isCollapsed = collapsedCollections.has(collection.address);

        return (
          <div
            className="AccountCollectibles__collection"
            key={collection.address}
            data-testid="account-collectible"
          >
            <button
              type="button"
              className="AccountCollectibles__collection__header"
              onClick={() => toggleCollection(collection.address)}
              aria-expanded={!isCollapsed}
              data-testid="account-collection-header"
            >
              <div
                className="AccountCollectibles__collection__header__name"
                data-testid="account-collection-name"
              >
                {collection.name}
              </div>
              <div className="AccountCollectibles__collection__header__right">
                <div
                  className="AccountCollectibles__collection__header__count"
                  data-testid="account-collection-count"
                >
                  {collectiblesToShow.length}
                </div>
                {isCollapsed ? <Icon.ChevronDown /> : <Icon.ChevronUp />}
              </div>
            </button>
            {!isCollapsed && (
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
            )}
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

/**
 * Whether the Collectibles tab has anything to show.
 *
 * Deliberately mirrors what CollectionsList above actually renders, hidden
 * filter included: it drops a collection once every collectible in it is
 * hidden, so counting a collection as visible on `collection && !error` alone
 * left the tab blank -- no grid and no empty state -- once the last one was
 * hidden.
 *
 * Exported because Home decides whether this tab's Add action goes inline or
 * stays in the floating pill, and an inline one needs the empty state below to
 * host it, so that decision has to read "empty" exactly the way this tab does.
 */
export const hasVisibleCollections = (
  collections: Collection[],
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean,
) =>
  collections.some(
    ({ collection, error }) =>
      collection &&
      !error &&
      collection.collectibles.some(
        (item) => !isCollectibleHidden(collection.address, item.tokenId),
      ),
  );

interface AccountCollectiblesProps {
  collections: Collection[];
  hasInlineCta: boolean;
  refreshHiddenCollectibles: () => Promise<void>;
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  onClickCollectible?: (selectedCollectible: SelectedCollectible) => void;
}

export const AccountCollectibles = ({
  collections,
  hasInlineCta,
  refreshHiddenCollectibles,
  isCollectibleHidden,
}: AccountCollectiblesProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hasValidCollections = hasVisibleCollections(
    collections,
    isCollectibleHidden,
  );

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
          <div className="AccountCollectibles__empty__badge">
            <Icon.Image01 />
          </div>
          <div className="AccountCollectibles__empty__title">
            {t("No collectibles yet")}
          </div>
          <div className="AccountCollectibles__empty__subtitle">
            {t("Collectibles you own will appear here.")}
          </div>
          {/* Set while the Tokens tab is showing its own unfunded empty state,
              so that both tabs offer the same kind of button. The pill stands
              down on this tab while it does. */}
          {hasInlineCta && (
            <div className="AccountCollectibles__empty__cta">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                isRounded
                onClick={() => navigateTo(ROUTES.addCollectibles, navigate)}
                data-testid="add-collectible-inline-btn"
              >
                {t("Add collectible")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
