import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon, Notification } from "@stellar/design-system";
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

    const { hiddenCollectibles, error } = await changeCollectibleVisibility({
      collectibleKey,
      collectibleVisibility: "visible",
      activePublicKey: publicKey,
    });

    setPendingKey(null);

    if (error) {
      toast.custom(() => (
        <Notification
          variant="error"
          title={t("Unable to show this collectible")}
        />
      ));
      return;
    }

    // The grid filters against the redux mirror, so the write has to land there
    // too or the row stays hidden until the popup reloads.
    dispatch(
      saveHiddenCollectibles({
        publicKey,
        networkName: networkDetails.networkName,
        hiddenCollectibles,
      }),
    );
    toast.custom(() => (
      <Notification variant="success" title={t("Collectible unhidden")} />
    ));
  };

  return (
    <SlideupModal isModalOpen={isOpen} setIsModalOpen={onClose}>
      <div className="HiddenCollectibles" data-testid="HiddenCollectibles">
        <div className="HiddenCollectibles__header">
          <span className="HiddenCollectibles__title">
            {t("Hidden collectibles")}
          </span>
          <button
            className="HiddenCollectibles__close"
            onClick={onClose}
            aria-label={t("Close")}
            data-testid="HiddenCollectibles__close"
          >
            <Icon.XClose />
          </button>
        </div>

        {hiddenItems.length ? (
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
        )}

        <div className="HiddenCollectibles__footer">
          <Button
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
