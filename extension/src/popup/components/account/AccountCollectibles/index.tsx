import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import classnames from "classnames";
import { Button, Icon, Loader } from "@stellar/design-system";
import { useLocation, useNavigate } from "react-router-dom";

import { Collection } from "@shared/api/types/types";
import { navigateTo } from "popup/helpers/navigate";
import {
  SlideupModal,
  SLIDEUP_MODAL_TRANSITION_MS,
} from "popup/components/SlideupModal";
import { ROUTES } from "popup/constants/routes";
import { CollectibleDetail, SelectedCollectible } from "../CollectibleDetail";
import { CollectibleInfoImage } from "../CollectibleInfo";
import { InlineAddButton } from "../InlineAddButton";
import { HomeEmptyState } from "../HomeEmptyState";

import "./styles.scss";

const CollectionsList = ({
  collections,
  isCollectibleHidden,
  onCloseCollectible,
}: {
  collections: Collection[];
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  onCloseCollectible: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<SelectedCollectible | null>(
    null,
  );
  // The pending "clear the selection once the sheet has slid out" timer. It has
  // to be cancellable: the backdrop stops taking clicks the moment the sheet
  // starts sliding out, so the grid underneath is live for the whole exit, and
  // a timer left running from the previous close would blank the sheet the user
  // just reopened.
  const clearDetailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingDetailClear = () => {
    if (clearDetailTimer.current !== null) {
      clearTimeout(clearDetailTimer.current);
      clearDetailTimer.current = null;
    }
  };

  useEffect(() => cancelPendingDetailClear, []);
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
      cancelPendingDetailClear();
      setDetailData({
        collectionAddress,
        tokenId,
      });
      setIsDetailOpen(true);
    }
  }, [location.search]);

  const handleOpenCollectible = (collectible: SelectedCollectible) => {
    cancelPendingDetailClear();
    setDetailData(collectible);
    setIsDetailOpen(true);
  };

  const handleCloseCollectible = () => {
    setIsDetailOpen(false);
    clearCollectibleDetailQueryParams();
    onCloseCollectible();
    // Clear the selection only once the sheet has slid out; dropping it
    // immediately would empty the card mid-animation. SlideupModal exposes no
    // animation-end hook, so this is timed against its transition -- and
    // tracked, so reopening within that window cancels it.
    cancelPendingDetailClear();
    clearDetailTimer.current = setTimeout(() => {
      clearDetailTimer.current = null;
      setDetailData(null);
    }, SLIDEUP_MODAL_TRANSITION_MS);
  };

  return (
    <>
      <div className="AccountCollectibles__list">
        {collections.map(({ collection, error }) => {
          // if the collection is missing or has an error, skip rendering
          if (error || !collection) {
            return null;
          }

          // Hidden collectibles live in the Hidden collectibles sheet instead
          const collectiblesToShow = collection.collectibles.filter(
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
                      className="AccountCollectibles__collection__grid__item"
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
      </div>

      {/* Rendered outside the map so it survives the close animation. */}
      <SlideupModal
        isModalOpen={isDetailOpen}
        ariaLabel={t("Collectible details")}
        setIsModalOpen={(open) => {
          if (!open) {
            handleCloseCollectible();
          }
        }}
      >
        <div className="AccountCollectibles__collectible-detail__sheet">
          {detailData ? (
            <CollectibleDetail
              // Remount per item. This sheet is rendered once, outside the
              // grid, and `handleOpenCollectible` cancels the pending clear --
              // so opening a second collectible inside the close animation
              // swaps props on a live `CollectibleDetail`. `useIsCollectibleTracked`
              // would then keep the previous item's `isTracked` until its own
              // lookup resolves, briefly offering Remove for an item that has
              // nothing local to remove.
              key={`${detailData.collectionAddress}:${detailData.tokenId}`}
              selectedCollectible={detailData}
              handleItemClose={handleCloseCollectible}
            />
          ) : (
            <div />
          )}
        </div>
      </SlideupModal>
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
 */
const hasVisibleCollections = (
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
  /**
   * The collectibles request has not resolved yet. Distinct from having none:
   * `collections` is empty in both cases, and rendering the empty state here
   * would tell the account it owns nothing while the answer is still in flight.
   */
  isLoading: boolean;
  /**
   * The data failed to load, so an empty `collections` is unknown rather than
   * empty: the empty state is skipped and only the Add action is offered.
   */
  hasError?: boolean;
  refreshHiddenCollectibles: () => Promise<void>;
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  onClickCollectible?: (selectedCollectible: SelectedCollectible) => void;
}

export const AccountCollectibles = ({
  collections,
  isLoading,
  hasError = false,
  refreshHiddenCollectibles,
  isCollectibleHidden,
}: AccountCollectiblesProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hasValidCollections = hasVisibleCollections(
    collections,
    isCollectibleHidden,
  );

  if (isLoading) {
    return (
      <div className="AccountCollectibles" data-testid="account-collectibles">
        <div
          className="AccountCollectibles__loader"
          data-testid="account-collectibles-loader"
        >
          <Loader size="2rem" />
        </div>
      </div>
    );
  }

  const addCollectibleButton = (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      isRounded
      onClick={() => navigateTo(ROUTES.addCollectibles, navigate)}
      data-testid="add-collectible-empty-btn"
    >
      {t("Add Collectible")}
    </Button>
  );

  if (!hasValidCollections && hasError) {
    return (
      <div
        className="AccountCollectibles AccountCollectibles--error"
        data-testid="account-collectibles"
      >
        {addCollectibleButton}
      </div>
    );
  }

  return (
    <div
      className={classnames("AccountCollectibles", {
        "AccountCollectibles--empty": !hasValidCollections,
      })}
      data-testid="account-collectibles"
    >
      {hasValidCollections ? (
        <>
          <CollectionsList
            collections={collections}
            isCollectibleHidden={isCollectibleHidden}
            onCloseCollectible={refreshHiddenCollectibles}
          />
          {/* Ends the grid and scrolls with it. Holding a collectible needs no
              funded account, so this follows an unfunded Tokens tab too. */}
          <InlineAddButton
            label={t("Add collectible")}
            route={ROUTES.addCollectibles}
            data-testid="add-collectible-btn"
          />
        </>
      ) : (
        // Figma's Empty card (1429:165964), with its own Add Collectible
        // button funded or not: with nothing in the grid there is no inline
        // Add collectible button to fall back on.
        <HomeEmptyState
          title={t("Collect your first NFT")}
          description={t("Collectibles you own will appear here.")}
          isWide
          data-testid="account-collectibles-empty"
        >
          {addCollectibleButton}
        </HomeEmptyState>
      )}
    </div>
  );
};
