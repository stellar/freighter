import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";
import { toast } from "sonner";

import { Collection } from "@shared/api/types/types";
import { changeCollectibleVisibility } from "@shared/api/internal";
import { AppDispatch } from "popup/App";
import { SlideupModal } from "popup/components/SlideupModal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { saveHiddenCollectibles } from "popup/ducks/hiddenCollectibles";
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
  isLoading: boolean;
  loadError: string;
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
  isLoading,
  loadError,
  isOpen,
  onClose,
}: HiddenCollectiblesProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
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
      const {
        hiddenCollectibles,
        networkName: resolvedNetworkName,
        error,
      } = await changeCollectibleVisibility({
        collectibleKey,
        collectibleVisibility: "visible",
        activePublicKey: publicKey,
      });

      if (error) {
        throw new Error(error);
      }

      // The grid filters against the redux mirror, so the write has to land
      // there too or the row stays hidden until the popup reloads. Keyed by the
      // network the background reports rather than the one selected here: the
      // request carries no network, so a switch that commits mid-flight writes
      // to -- and answers with -- the other network's map. The fallback covers
      // a service worker from before this shipped; drop it once rolled out.
      dispatch(
        saveHiddenCollectibles({
          publicKey,
          networkName: resolvedNetworkName || networkDetails.networkName,
          hiddenCollectibles,
        }),
      );
      toast.custom(() => (
        <Notification variant="success" title={t("Collectible unhidden")} />
      ));
    } catch (e) {
      toast.custom(() => (
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
      <div className="HiddenCollectibles" data-testid="HiddenCollectibles">
        <div className="HiddenCollectibles__header">
          <span className="HiddenCollectibles__title">
            {t("Hidden collectibles")}
          </span>
          <button
            // Explicit, not decorative: AddCollectibles is this sheet's only
            // caller and it renders inside a Formik `<Form>`, so an untyped
            // button submits it -- dismissing the sheet would add the
            // collectible. SlideupModal renders in place rather than in a
            // portal, so the sheet really is inside that form element.
            type="button"
            className="HiddenCollectibles__close"
            onClick={onClose}
            aria-label={t("Close")}
            data-testid="HiddenCollectibles__close"
          >
            <Icon.XClose />
          </button>
        </div>

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

        <div className="HiddenCollectibles__footer">
          <Button
            type="button"
            size="md"
            variant="tertiary"
            isRounded
            isFullWidth
            onClick={onClose}
            data-testid="HiddenCollectibles__done"
          >
            {t("Close")}
          </Button>
        </div>
      </div>
    </SlideupModal>
  );
};
