import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, Icon, Notification } from "@stellar/design-system";
import { toast } from "sonner";

import { Collection } from "@shared/api/types/types";
import { AssetVisibility } from "@shared/api/types";
import { changeCollectibleVisibility } from "@shared/api/internal";
import { HiddenItemsSheet } from "popup/components/HiddenItemsSheet";
import { publicKeySelector } from "popup/ducks/accountServices";
import { CollectibleInfoImage, getCollectibleName } from "../CollectibleInfo";

import "./styles.scss";

interface HiddenCollectiblesProps {
  collections: Collection[];
  refreshHiddenCollectibles: () => Promise<void>;
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface HiddenItem {
  collectionAddress: string;
  tokenId: string;
  /** The metadata name, or "Token #<id>" when the metadata has none */
  name: string;
  /** Whether `name` came from the metadata, so the id line isn't repeated */
  hasMetadataName: boolean;
  image?: string;
}

/**
 * Bottom sheet listing the hidden collectibles with an Unhide button per
 * row, and an empty state when nothing is hidden. Opened from "Show hidden"
 * on the Add collectible screen. Same sheet as Hidden tokens.
 */
export const HiddenCollectibles = ({
  collections,
  refreshHiddenCollectibles,
  isCollectibleHidden,
  isOpen,
  onClose,
}: HiddenCollectiblesProps) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  // Key of the collectible whose unhide is in flight, if any
  const [unhidingKey, setUnhidingKey] = useState("");

  // Refresh hidden collectibles when sheet opens
  useEffect(() => {
    if (isOpen) {
      refreshHiddenCollectibles();
    }
  }, [isOpen, refreshHiddenCollectibles]);

  // Get all hidden collectibles across all collections
  const hiddenItems: HiddenItem[] = [];

  collections.forEach(({ collection, error }) => {
    if (error || !collection) return;

    collection.collectibles.forEach((item) => {
      if (isCollectibleHidden(collection.address, item.tokenId)) {
        hiddenItems.push({
          collectionAddress: collection.address,
          tokenId: item.tokenId,
          name: getCollectibleName(item.metadata?.name, item.tokenId),
          hasMetadataName: !!item.metadata?.name,
          image: item.metadata?.image,
        });
      }
    });
  });

  /**
   * Unhides a collectible, refreshes the shared hidden state, confirms with
   * a toast and closes the sheet so the result is visible straight away.
   */
  const handleUnhide = async ({ collectionAddress, tokenId }: HiddenItem) => {
    const collectibleKey = `${collectionAddress}:${tokenId}`;

    if (unhidingKey) {
      return;
    }

    setUnhidingKey(collectibleKey);

    try {
      const { error } = await changeCollectibleVisibility({
        collectibleKey,
        collectibleVisibility: "visible" as AssetVisibility,
        activePublicKey: publicKey || "",
      });

      if (error) {
        throw new Error(error);
      }

      await refreshHiddenCollectibles();
      onClose();
      toast.custom(() => (
        <Notification variant="success" title={t("Collectible unhidden")} />
      ));
    } catch {
      toast.custom(() => (
        <Notification
          variant="error"
          title={t("Couldn’t unhide collectible")}
        />
      ));
    } finally {
      setUnhidingKey("");
    }
  };

  return (
    <HiddenItemsSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("Hidden collectibles")}
      emptyText={t("No hidden collectibles")}
      data-testid="hidden-collectibles"
      rows={hiddenItems.map((item) => {
        const key = `${item.collectionAddress}:${item.tokenId}`;

        return (
          <div
            className="HiddenCollectibles__row"
            key={key}
            data-testid={`hidden-collectible-${item.tokenId}`}
          >
            <div className="HiddenCollectibles__row__image">
              <CollectibleInfoImage
                image={item.image}
                name={item.name}
                isSmall
              />
            </div>
            <div className="HiddenCollectibles__row__body">
              <div className="HiddenCollectibles__row__name">{item.name}</div>
              {item.hasMetadataName ? (
                <div className="HiddenCollectibles__row__id">
                  #{item.tokenId}
                </div>
              ) : null}
            </div>
            <Button
              size="md"
              variant="secondary"
              type="button"
              disabled={unhidingKey === key}
              isLoading={unhidingKey === key}
              onClick={() => handleUnhide(item)}
              data-testid={`hidden-collectible-unhide-${item.tokenId}`}
            >
              <div className="HiddenCollectibles__row__unhide-label">
                {t("Unhide")}
              </div>
              {unhidingKey === key ? null : <Icon.Eye />}
            </Button>
          </div>
        );
      })}
    />
  );
};
