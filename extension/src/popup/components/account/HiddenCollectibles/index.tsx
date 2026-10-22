import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";

import { Collection } from "@shared/api/types/types";
import { changeCollectibleVisibility } from "@shared/api/internal";
import { SheetHeader } from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import { SlideupModal } from "popup/components/SlideupModal";
import { showToast } from "popup/basics/shadcn/Toast";
import { publicKeySelector } from "popup/ducks/accountServices";
import { CollectibleInfoImage } from "../CollectibleInfo";

import "./styles.scss";

interface HiddenCollectiblesProps {
  collections: Collection[];
  refreshHiddenCollectibles: () => Promise<void>;
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  /**
   * The scoped visibility map has not arrived yet. Distinct from having none
   * hidden: `isCollectibleHidden` answers `false` for everything either way, and
   * rendering the empty state here claims nothing is hidden while the answer is
   * still in flight.
   */
  isLoading?: boolean;
  loadError?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The account's hidden collectibles, with a per-row unhide.
 *
 * Unhiding used to mean opening a second sheet on top of this one and going
 * through the detail view's overflow menu. The designs put an Unhide button on
 * the row itself, which removes the reason that second sheet existed -- and
 * two floating cards open at once would stack badly.
 */
export const HiddenCollectibles = ({
  collections,
  refreshHiddenCollectibles,
  isCollectibleHidden,
  isLoading = false,
  loadError = "",
  isOpen,
  onClose,
}: HiddenCollectiblesProps) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshHiddenCollectibles();
    }
  }, [isOpen, refreshHiddenCollectibles]);

  const hiddenItems: Array<{
    collectionAddress: string;
    collectionName: string;
    tokenId: string;
    image?: string;
    name?: string;
  }> = [];

  collections.forEach(({ collection, error }) => {
    if (error || !collection) {
      return;
    }

    collection.collectibles.forEach((item) => {
      if (isCollectibleHidden(collection.address, item.tokenId)) {
        hiddenItems.push({
          collectionAddress: collection.address,
          collectionName: collection.name,
          tokenId: item.tokenId,
          image: item.metadata?.image,
          name: item.metadata?.name,
        });
      }
    });
  });

  const handleUnhide = async (collectionAddress: string, tokenId: string) => {
    const collectibleKey = `${collectionAddress}:${tokenId}`;
    setPendingKey(collectibleKey);

    // `sendMessageToBackground` awaits `browser.runtime.sendMessage` with no
    // catch, so a failed send rejects rather than returning an `error`. Clearing
    // the pending key only on the happy path would leave every Unhide button in
    // the sheet disabled, with nothing on screen to say why.
    try {
      const { error } = await changeCollectibleVisibility({
        collectibleKey,
        collectibleVisibility: "visible",
        activePublicKey: publicKey,
      });

      if (error) {
        throw new Error(error);
      }

      // The grid filters against the shared hook state, so pull the new map
      // before confirming or the row stays hidden until the next fetch.
      await refreshHiddenCollectibles();
      showToast(() => (
        <Notification variant="success" title={t("Collectible unhidden")} />
      ));
    } catch (e) {
      showToast(() => (
        <Notification
          variant="error"
          title={t("Unable to show this collectible")}
        />
      ));
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <SlideupModal
      isModalOpen={isOpen}
      setIsModalOpen={onClose}
      ariaLabel={t("Hidden collectibles")}
    >
      <SheetLayout
        data-testid="HiddenCollectibles"
        header={
          // SheetHeader's X is type="button": this sheet renders inside
          // AddCollectibles' Formik <Form>, so an untyped button would submit
          // it and add the collectible on dismiss.
          <SheetHeader
            title={t("Hidden collectibles")}
            onClose={onClose}
            closeTestId="HiddenCollectibles__close"
          />
        }
      >
        <div className="HiddenCollectibles">
          {(() => {
            if (loadError) {
              return (
                <div
                  className="HiddenCollectibles__empty"
                  data-testid="HiddenCollectibles__error"
                >
                  <Notification
                    variant="error"
                    title={t("Unable to load hidden collectibles")}
                  />
                </div>
              );
            }

            if (isLoading) {
              return (
                <div
                  className="HiddenCollectibles__loader"
                  data-testid="HiddenCollectibles__loader"
                >
                  <Loader size="2rem" />
                </div>
              );
            }

            return hiddenItems.length ? (
              <div className="HiddenCollectibles__list">
                {hiddenItems.map((item) => {
                  const collectibleKey = `${item.collectionAddress}:${item.tokenId}`;
                  return (
                    <div
                      className="HiddenCollectibles__row"
                      key={collectibleKey}
                      data-testid={`hidden-collectible-${item.tokenId}`}
                    >
                      <div className="HiddenCollectibles__row__image">
                        <CollectibleInfoImage
                          image={item.image}
                          name={item.tokenId}
                          isSmall
                        />
                      </div>
                      <div className="HiddenCollectibles__row__identity">
                        <div className="HiddenCollectibles__row__name">
                          {item.name || item.collectionName}
                        </div>
                        <div className="HiddenCollectibles__row__token-id">
                          #{item.tokenId}
                        </div>
                      </div>
                      <Button
                        // See the close button above: the design-system `Button`
                        // spreads props onto a bare `<button>` without defaulting
                        // the type, so this needs it too.
                        type="button"
                        // `md` matches the designs: 32px tall, 6px radius. Not
                        // isRounded -- the row action is a rounded rect, only the
                        // footer is a pill.
                        size="md"
                        variant="tertiary"
                        isLoading={pendingKey === collectibleKey}
                        disabled={pendingKey !== null}
                        onClick={() =>
                          handleUnhide(item.collectionAddress, item.tokenId)
                        }
                        data-testid={`hidden-collectible-unhide-${item.tokenId}`}
                        icon={<Icon.Eye />}
                        iconPosition="right"
                      >
                        {t("Unhide")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="HiddenCollectibles__empty">
                {t("No hidden collectibles")}
              </div>
            );
          })()}
        </div>
      </SheetLayout>
    </SlideupModal>
  );
};
